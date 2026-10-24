/**
 * Answers the app's Soroban RPC calls from `fixtures.ts`, so the visual tests
 * never touch the network. Contract reads reach the RPC as `simulateTransaction`
 * requests; this decodes which contract function was called and replies with
 * the matching fixture, encoded the way the real contracts return it.
 */

import type { Page, Route } from "@playwright/test";
import {
  Address,
  Networks,
  SorobanDataBuilder,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  type Operation,
  type Transaction,
} from "@stellar/stellar-sdk";
import { LEDGER, PLANS, STATS, SUBSCRIPTIONS, TOKENS } from "./fixtures";

const RPC_URL = "https://soroban-testnet.stellar.org/**";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "*",
};

type Row = Record<string, unknown>;

const isAddress = (value: string) => StrKey.isValidEd25519PublicKey(value) || StrKey.isValidContract(value);

/** Strings that are valid strkeys become addresses; everything else follows the JS type. */
function scVal(value: unknown): xdr.ScVal {
  if (typeof value === "string") return isAddress(value) ? new Address(value).toScVal() : nativeToScVal(value, { type: "string" });
  if (typeof value === "bigint") return nativeToScVal(value, { type: "i128" });
  if (typeof value === "boolean") return nativeToScVal(value);
  if (typeof value === "number") return nativeToScVal(value, { type: "u32" });
  throw new Error(`No fixture encoding for ${typeof value}`);
}

/**
 * A contract struct: a map with symbol keys, which `scValToNative` reads back
 * as an object. `u64Keys` are the fields the contract stores as u64.
 */
function struct(row: Row, u64Keys: string[] = []): xdr.ScVal {
  const entries = Object.keys(row)
    .sort()
    .map(
      (key) =>
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol(key),
          val: u64Keys.includes(key) ? nativeToScVal(BigInt(row[key] as number), { type: "u64" }) : scVal(row[key]),
        }),
    );
  return xdr.ScVal.scvMap(entries);
}

const planScVal = (plan: Row) => struct(plan, ["id", "created_at"]);
const subscriptionScVal = (sub: Row) =>
  struct(sub, ["id", "plan_id", "start_ledger", "last_charge_ledger", "next_charge_ledger"]);

/** The value a contract function returns, or null if the tests have no fixture for it. */
function answer(contractId: string, method: string, args: unknown[]): xdr.ScVal | null {
  const token = TOKENS[contractId];
  if (token) {
    if (method === "symbol") return nativeToScVal(token.symbol, { type: "string" });
    if (method === "name") return nativeToScVal(token.name, { type: "string" });
    if (method === "decimals") return nativeToScVal(token.decimals, { type: "u32" });
    if (method === "balance") return nativeToScVal(5_000_000_000n, { type: "i128" });
  }
  switch (method) {
    case "get_stats":
      return struct(STATS);
    case "get_active_plans":
      return xdr.ScVal.scvVec(PLANS.map(planScVal));
    case "get_plan": {
      const plan = PLANS.find((p) => BigInt(p.id) === args[0]);
      return plan ? planScVal(plan) : null;
    }
    case "get_by_subscriber":
      return xdr.ScVal.scvVec(SUBSCRIPTIONS.filter((s) => s.subscriber === args[0]).map(subscriptionScVal));
    default:
      return null;
  }
}

const u32 = (n: number) => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(n);
  return buf;
};
const zeros = (n: number) => Buffer.alloc(n);

/**
 * The SDK decodes `headerXdr` and `metadataXdr` out of every getLatestLedger
 * answer, so they must be real XDR. This is an empty ledger at `LEDGER`: a
 * header whose fields are zero apart from its sequence, and a close meta that
 * wraps it with no transactions.
 */
function latestLedger() {
  const header = Buffer.concat([
    u32(23), zeros(32), // ledger version, previous ledger hash
    zeros(32), zeros(8), u32(0), u32(0), // stellar value: tx set hash, close time, upgrades, ext
    zeros(32), zeros(32), // tx set result hash, bucket list hash
    u32(LEDGER), // ledger sequence
    zeros(8), zeros(8), u32(0), zeros(8), // total coins, fee pool, inflation seq, id pool
    u32(100), u32(5_000_000), u32(1000), // base fee, base reserve, max tx set size
    zeros(128), // skip list
    u32(0), // ext
  ]);
  const meta = Buffer.concat([
    u32(0), // LedgerCloseMeta v0
    zeros(32), header, u32(0), // ledger header history entry: hash, header, ext
    zeros(32), u32(0), // tx set: previous ledger hash, no transactions
    u32(0), u32(0), u32(0), // no tx processing, upgrades or scp info
  ]);
  return {
    id: "fixture",
    protocolVersion: 23,
    sequence: LEDGER,
    closeTime: "0",
    headerXdr: header.toString("base64"),
    metadataXdr: meta.toString("base64"),
  };
}

function simulate(transaction: string, unmocked: string[]) {
  const tx = TransactionBuilder.fromXDR(transaction, Networks.TESTNET) as Transaction;
  const invoke = (tx.operations[0] as Operation.InvokeHostFunction).func.value as xdr.InvokeContractArgs;
  const contractId = Address.fromScAddress(invoke.contractAddress).toString();
  const method = invoke.functionName.toString();
  const retval = answer(contractId, method, invoke.args.map((a) => scValToNative(a)));

  if (!retval) {
    unmocked.push(`${method} on ${contractId}`);
    return { error: `no fixture for ${method}`, latestLedger: LEDGER };
  }
  return {
    latestLedger: LEDGER,
    minResourceFee: "0",
    transactionData: new SorobanDataBuilder().build().toXDR("base64"),
    results: [{ auth: [], xdr: retval.toXDR("base64") }],
  };
}

/**
 * Route every Soroban RPC call on the page to the fixtures, and refuse any
 * other request that leaves localhost so nothing depends on the network.
 *
 * Returns the contract calls that had no fixture; a test should expect it to
 * stay empty.
 */
export async function mockSorobanRpc(page: Page): Promise<string[]> {
  const unmocked: string[] = [];

  await page.route(
    (url) => !["localhost", "127.0.0.1"].includes(url.hostname),
    (route) => route.abort(),
  );

  await page.route(RPC_URL, async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const { id, method, params } = request.postDataJSON() as {
      id: unknown;
      method: string;
      params?: { transaction: string };
    };

    let result: unknown;
    if (method === "getLatestLedger") {
      result = latestLedger();
    } else if (method === "simulateTransaction" && params) {
      result = simulate(params.transaction, unmocked);
    } else {
      unmocked.push(method);
      await route.fulfill({
        headers: CORS,
        json: { jsonrpc: "2.0", id, error: { code: -32601, message: `no fixture for ${method}` } },
      });
      return;
    }
    await route.fulfill({ headers: CORS, json: { jsonrpc: "2.0", id, result } });
  });

  return unmocked;
}
