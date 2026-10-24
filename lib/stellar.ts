/**
 * Soroban RPC engine: network configuration, read-only simulation, and the
 * build → simulate → sign → submit → confirm pipeline for writes.
 *
 * Per-contract bindings live in `lib/contracts.ts`; this module knows nothing
 * about subscriptions.
 */

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import type { Network, TxPhase, TxResult } from "@/types";

interface NetworkConfig {
  label: string;
  rpcUrl: string;
  passphrase: string;
  explorer: string;
  /** Funded account used only as the source of read simulations. */
  readAccount: string | null;
}

export const NETWORKS: Record<Network, NetworkConfig> = {
  testnet: {
    label: "Testnet",
    rpcUrl: process.env.NEXT_PUBLIC_TESTNET_RPC_URL || "https://soroban-testnet.stellar.org",
    passphrase: Networks.TESTNET,
    explorer: "https://stellar.expert/explorer/testnet",
    readAccount:
      process.env.NEXT_PUBLIC_TESTNET_READ_ACCOUNT ||
      "GBQHBOJHJ3SPU5TYNOABLKIXOZQFMN25ZNALA3QC46Q3I4IN5Q2KXZXI",
  },
  mainnet: {
    label: "Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://mainnet.sorobanrpc.com",
    passphrase: Networks.PUBLIC,
    explorer: "https://stellar.expert/explorer/public",
    readAccount: process.env.NEXT_PUBLIC_MAINNET_READ_ACCOUNT || null,
  },
};

export const DEFAULT_NETWORK: Network =
  process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? "mainnet" : "testnet";

export const explorerTxUrl = (network: Network, hash: string) =>
  `${NETWORKS[network].explorer}/tx/${hash}`;
export const explorerAccountUrl = (network: Network, account: string) =>
  `${NETWORKS[network].explorer}/account/${account}`;
export const explorerContractUrl = (network: Network, id: string) =>
  `${NETWORKS[network].explorer}/contract/${id}`;

const servers = new Map<Network, rpc.Server>();

export function getServer(network: Network): rpc.Server {
  let server = servers.get(network);
  if (!server) {
    const url = NETWORKS[network].rpcUrl;
    server = new rpc.Server(url, { allowHttp: url.startsWith("http://") });
    servers.set(network, server);
  }
  return server;
}

/**
 * A failure with a message safe to show a person, plus an optional raw
 * `detail` for the console and an optional contract error `code`.
 */
export class ContractError extends Error {
  readonly detail?: string;
  readonly code?: number;
  constructor(message: string, detail?: string, code?: number) {
    super(message);
    this.name = "ContractError";
    this.detail = detail;
    this.code = code;
  }
}

/** Contract error code → sentence, one table per contract. */
export type ErrorTable = Record<number, string>;

/** Turn a raw simulation / host error into a sentence using `errors`. */
export function explainError(raw: string, errors: ErrorTable): ContractError {
  const match = /Error\(Contract,\s*#(\d+)\)/.exec(raw);
  if (match) {
    const code = Number(match[1]);
    return new ContractError(
      errors[code] ?? `The contract rejected this (error ${code}).`,
      raw,
      code,
    );
  }
  if (/balance|insufficient|trustline/i.test(raw)) {
    return new ContractError("The account doesn't hold enough of this token.", raw);
  }
  return new ContractError("The network couldn't complete this request.", raw);
}

export const arg = {
  address: (v: string): xdr.ScVal => new Address(v).toScVal(),
  string: (v: string): xdr.ScVal => nativeToScVal(v, { type: "string" }),
  u32: (v: number): xdr.ScVal => nativeToScVal(v, { type: "u32" }),
  u64: (v: number | bigint): xdr.ScVal => nativeToScVal(BigInt(v), { type: "u64" }),
  i128: (v: bigint): xdr.ScVal => nativeToScVal(v, { type: "i128" }),
};

const RETRIES = 3;

/** Public RPC nodes rate-limit bursts; retry those, never contract errors. */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const message = e instanceof Error ? e.message : String(e);
      const transient = /429|rate.?limit|too many|timeout|network|fetch failed/i.test(message);
      if (!transient || attempt === RETRIES - 1) throw e;
      await sleep(300 * 2 ** attempt + Math.random() * 200);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call a contract function read-only by simulating it. Nothing is signed or
 * submitted. Returns the decoded native value.
 */
export async function readContract<T>(
  network: Network,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  errors: ErrorTable,
): Promise<T> {
  const source = NETWORKS[network].readAccount;
  if (!source) {
    throw new ContractError(`Reading from ${NETWORKS[network].label} isn't configured.`);
  }
  const tx = new TransactionBuilder(new Account(source, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORKS[network].passphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await withRetry(() => getServer(network).simulateTransaction(tx));
  if (rpc.Api.isSimulationError(sim)) throw explainError(sim.error, errors);
  const retval = sim.result?.retval;
  return (retval ? scValToNative(retval) : undefined) as T;
}

/**
 * Token metadata cache. Each distinct token otherwise costs three simulate
 * calls (symbol, name, decimals) on every page load. We persist the result in
 * `localStorage`, keyed by network + token address, with a short expiry so a
 * token's metadata can still be refreshed. Every storage access is guarded so
 * a missing / full / corrupt store never breaks the page.
 */
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
}

const TOKEN_CACHE_PREFIX = "handsoff:token:";
const TOKEN_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function tokenCacheKey(network: Network, tokenId: string): string {
  return `${TOKEN_CACHE_PREFIX}${network}:${tokenId}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read cached token metadata, or `null` when absent, expired, or unreadable. */
export function readTokenCache(network: Network, tokenId: string): TokenMetadata | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(tokenCacheKey(network, tokenId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: TokenMetadata; expires?: number };
    if (!parsed || typeof parsed.expires !== "number" || parsed.expires < Date.now()) {
      return null;
    }
    const data = parsed.data;
    if (
      !data ||
      typeof data.symbol !== "string" ||
      typeof data.name !== "string" ||
      typeof data.decimals !== "number"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Persist token metadata. Failures (quota, disabled storage) are swallowed. */
export function writeTokenCache(
  network: Network,
  tokenId: string,
  data: TokenMetadata,
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      tokenCacheKey(network, tokenId),
      JSON.stringify({ data, expires: Date.now() + TOKEN_CACHE_TTL_MS }),
    );
  } catch {
    // Storage full or unavailable — caching is best-effort only.
  }
}

/** Everything a write needs: who signs, on which network, and progress. */
export interface WriteCtx {
  network: Network;
  source: string;
  sign: (xdr: string) => Promise<string>;
  onPhase?: (phase: TxPhase) => void;
}

/**
 * Invoke a contract function as `ctx.source`. Simulates first, so a contract
 * rejection is reported before the wallet is ever asked to sign, then signs
 * through `ctx.sign` and submits. Returns the confirmed hash.
 */
export async function writeContract(
  ctx: WriteCtx,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  errors: ErrorTable,
): Promise<TxResult> {
  const server = getServer(ctx.network);
  const account = await withRetry(() => server.getAccount(ctx.source));
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORKS[ctx.network].passphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  ctx.onPhase?.("simulating");
  const sim = await withRetry(() => server.simulateTransaction(tx));
  if (rpc.Api.isSimulationError(sim)) throw explainError(sim.error, errors);
  rpc.assembleTransaction(tx, sim);

  ctx.onPhase?.("signing");
  const signed = await ctx.sign(tx.toXDR());

  ctx.onPhase?.("submitting");
  const sent = await withRetry(() => server.sendTransaction(TransactionBuilder.fromXDR(signed, NETWORKS[ctx.network].passphrase)));
  if (sent.status === "ERROR") {
    throw explainError(JSON.stringify(sent.errorResult ?? sent), errors);
  }

  ctx.onPhase?.("confirming");
  const hash = sent.hash;
  for (let i = 0; i < 30; i++) {
    const res = await withRetry(() => server.getTransaction(hash));
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, network: ctx.network };
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw explainError(JSON.stringify(res), errors);
    }
    await sleep(1000);
  }
  throw new ContractError("The transaction is taking longer than expected to confirm.");
}
