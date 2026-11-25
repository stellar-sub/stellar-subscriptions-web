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
      process.env.NEXT_PUBLIC_TESTNET_READ_ACCOUNT || "GBQHBOJHJ3SPU5TYNOABLKIXOZQFMN25ZNALA3QC46Q3I4IN5Q2KXZXI",
  },
  mainnet: {
    label: "Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://mainnet.sorobanrpc.com",
    passphrase: Networks.PUBLIC,
    explorer: "https://stellar.expert/explorer/public",
    readAccount: process.env.NEXT_PUBLIC_MAINNET_READ_ACCOUNT || null,
  },
};

export const DEFAULT_NETWORK: Network = process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? "mainnet" : "testnet";

/** Approximate seconds per ledger on Stellar. */
export const LEDGER_SECONDS = 5;

export const explorerTxUrl = (network: Network, hash: string) => `${NETWORKS[network].explorer}/tx/${hash}`;
export const explorerAccountUrl = (network: Network, account: string) =>
  `${NETWORKS[network].explorer}/account/${account}`;
export const explorerContractUrl = (network: Network, id: string) => `${NETWORKS[network].explorer}/contract/${id}`;

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
    return new ContractError(errors[code] ?? `The contract rejected this (error ${code}).`, raw, code);
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

/**
 * Run `fn`, retrying transient RPC failures with exponential back-off.
 *
 * Public RPC nodes rate-limit bursts, so a call is attempted at most
 * `RETRIES` (3) times. Between attempts it waits
 * `300ms × 2^attempt + jitter`, where jitter is up to 200ms of random delay
 * (so roughly 300–500ms, then 600–800ms). Only transient errors are retried:
 * HTTP 429 / rate-limit responses, timeouts, and network / fetch failures.
 * Anything else — contract errors in particular — is rethrown immediately,
 * as is the last transient error once the attempts are exhausted.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
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

/** A Soroban contract id is a 56-character strkey starting with `C`. */
const CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;

/** True when `id` looks like a valid Soroban contract id. */
export function isContractId(id: string): boolean {
  return CONTRACT_ID_RE.test(id);
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
  if (!isContractId(contractId)) {
    throw new ContractError("Invalid contract id");
  }
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
 * through `ctx.sign`, submits, and waits for the ledger to confirm.
 */
export async function invokeContract(
  ctx: WriteCtx,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  errors: ErrorTable,
): Promise<TxResult> {
  const server = getServer(ctx.network);
  const passphrase = NETWORKS[ctx.network].passphrase;

  ctx.onPhase?.("building");
  const account = await withRetry(() => server.getAccount(ctx.source)).catch((e: unknown) => {
    throw new ContractError(
      "This account isn't funded on this network yet, so it can't send transactions.",
      e instanceof Error ? e.message : String(e),
    );
  });
  const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(120)
    .build();

  const sim = await withRetry(() => server.simulateTransaction(built));
  if (rpc.Api.isSimulationError(sim)) throw explainError(sim.error, errors);
  const prepared = rpc.assembleTransaction(built, sim).build();

  ctx.onPhase?.("signing");
  const signed = TransactionBuilder.fromXDR(await ctx.sign(prepared.toXDR()), passphrase);

  ctx.onPhase?.("submitting");
  const sent = await server.sendTransaction(signed);
  if (sent.status === "ERROR" || sent.status === "TRY_AGAIN_LATER") {
    throw new ContractError(
      sent.status === "TRY_AGAIN_LATER"
        ? "The network is busy. Nothing was charged — try again in a moment."
        : "The network rejected the transaction. Nothing was changed.",
      JSON.stringify(sent.errorResult ?? sent),
    );
  }

  ctx.onPhase?.("confirming");
  const final = await confirm(server, sent.hash);
  if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new ContractError(
      "The transaction was included but failed, so nothing changed on-chain.",
      `${sent.hash}: ${JSON.stringify(final.status)}`,
    );
  }

  let returnValue: unknown;
  if (final.returnValue) {
    try {
      returnValue = scValToNative(final.returnValue);
    } catch {
      returnValue = undefined;
    }
  }
  return { hash: sent.hash, returnValue };
}

async function confirm(server: rpc.Server, hash: string, timeoutMs = 60_000): Promise<rpc.Api.GetTransactionResponse> {
  const started = Date.now();
  for (;;) {
    const res = await withRetry(() => server.getTransaction(hash));
    if (res.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) return res;
    if (Date.now() - started > timeoutMs) {
      throw new ContractError(
        "Still waiting for the network to confirm. It may yet succeed — check the explorer before retrying.",
        hash,
      );
    }
    await sleep(2_000);
  }
}

export async function getLatestLedger(network: Network): Promise<number> {
  const res = await withRetry(() => getServer(network).getLatestLedger());
  return res.sequence;
}

/** Events fetched per page by {@link walkEvents}. */
export const PAGE_SIZE = 200;
/** Upper bound on pages walked by {@link walkEvents}. */
export const MAX_PAGES = 40;
/** Ledgers of slack subtracted when computing an event window start. */
export const WINDOW_MARGIN = 100;

/**
 * The ledger encoded in a paging cursor. Cursors are `toid` values: the
 * ledger sequence shifted left by 32 bits, plus a transaction/op index.
 */
export function cursorLedger(cursor: string): number {
  return Math.floor(Number(BigInt(cursor) >> 32n));
}

/**
 * Walk a contract's events from `startLedger` forward, page by page, decoding
 * each event with `decoder`. Stops once the cursor catches up with the latest
 * ledger or after {@link MAX_PAGES} pages.
 */
export async function walkEvents<T>(
  server: rpc.Server,
  filters: rpc.Api.EventFilter[],
  decoder: (event: rpc.Api.EventResponse) => T,
  startLedger: number,
): Promise<{ events: T[]; latestLedger: number }> {
  const events: T[] = [];
  let cursor: string | undefined;
  let latestLedger = startLedger;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await withRetry(() =>
      server.getEvents({
        startLedger: cursor ? undefined : startLedger,
        cursor,
        filters,
        limit: PAGE_SIZE,
      }),
    );
    latestLedger = res.latestLedger;
    for (const event of res.events) events.push(decoder(event));
    if (!res.cursor || cursorLedger(res.cursor) >= res.latestLedger) break;
    cursor = res.cursor;
  }

  return { events, latestLedger };
}

/** Oldest and latest ledger the RPC node still holds events for. */
export async function getEventWindow(network: Network): Promise<{ oldest: number; latest: number }> {
  const health = await withRetry(() => getServer(network).getHealth());
  return { oldest: health.oldestLedger, latest: health.latestLedger };
}