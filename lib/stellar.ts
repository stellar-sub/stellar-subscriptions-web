import {
  Address,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { NETWORK, type Network } from "./config";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";

/**
 * All configured RPC endpoints, in priority order. The primary is
 * `NEXT_PUBLIC_RPC_URL`; additional fallbacks come from a comma-separated
 * `NEXT_PUBLIC_RPC_URLS` list. Duplicates are dropped so a single endpoint
 * configured twice does not count as a fallback.
 */
export const RPC_URLS: string[] = (() => {
  const extra = (process.env.NEXT_PUBLIC_RPC_URLS ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  const all = [RPC_URL, ...extra];
  return all.filter((url, i) => all.indexOf(url) === i);
})();

/** How many consecutive failures on one endpoint before we fail over. */
export const FAILOVER_THRESHOLD = 2;

const servers = new Map<string, rpc.Server>();

function serverFor(url: string): rpc.Server {
  let server = servers.get(url);
  if (!server) {
    server = new rpc.Server(url, { allowHttp: url.startsWith("http://") });
    servers.set(url, server);
  }
  return server;
}

/** Consecutive failure counts keyed by endpoint URL. */
const failures = new Map<string, number>();

/** Index of the endpoint currently preferred for new requests. */
let preferred = 0;

function recordSuccess(url: string) {
  failures.set(url, 0);
}

function recordFailure(url: string) {
  const count = (failures.get(url) ?? 0) + 1;
  failures.set(url, count);
  if (count >= FAILOVER_THRESHOLD) {
    const idx = RPC_URLS.indexOf(url);
    if (idx !== -1 && idx === preferred) {
      preferred = (idx + 1) % RPC_URLS.length;
    }
  }
}

/** Endpoints in the order we should try them, starting from the preferred one. */
function orderedEndpoints(): string[] {
  return [...RPC_URLS.slice(preferred), ...RPC_URLS.slice(0, preferred)];
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|rate.?limit|too many requests/i.test(msg);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn` against the preferred endpoint, failing over to the next one after
 * repeated failures. Rate-limit (429) responses are retried on the same
 * endpoint with backoff before failing over.
 */
export async function withRpc<T>(fn: (server: rpc.Server) => Promise<T>): Promise<T> {
  const endpoints = orderedEndpoints();
  let lastError: unknown;

  for (const url of endpoints) {
    const server = serverFor(url);
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await fn(server);
        recordSuccess(url);
        return result;
      } catch (err) {
        lastError = err;
        if (isRateLimit(err) && attempt < maxAttempts - 1) {
          await sleep(250 * 2 ** attempt);
          continue;
        }
        recordFailure(url);
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function getServer(): rpc.Server {
  return serverFor(RPC_URLS[preferred]);
}

export const server = getServer();

export const networkPassphrase =
  NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

export function addressToScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function i128ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function u32ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function scValToBigInt(value: xdr.ScVal): bigint {
  return scValToNative(value) as bigint;
}

export async function getAccount(publicKey: string) {
  return withRpc((s) => s.getAccount(publicKey));
}

export async function simulate(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  source: string,
) {
  return withRpc(async (s) => {
    const account = await s.getAccount(source);
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    return s.simulateTransaction(tx);
  });
}

export async function submit(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signer: Keypair,
) {
  return withRpc(async (s) => {
    const account = await s.getAccount(signer.publicKey());
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const prepared = await s.prepareTransaction(tx);
    prepared.sign(signer);
    return s.sendTransaction(prepared);
  });
}

export interface ExplainedError {
  code?: number;
  message: string;
  detail: string;
}

export function explainError(
  raw: string,
  table: Record<number, string>,
): ExplainedError {
  const match = /Error\(Contract, #(\d+)\)/.exec(raw);
  if (match) {
    const code = Number(match[1]);
    const known = table[code];
    return {
      code,
      message: known ?? `The contract rejected this with error ${code}.`,
      detail: raw,
    };
  }
  return { message: raw, detail: raw };
}

export type { Network };
