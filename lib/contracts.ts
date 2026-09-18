/**
 * Typed bindings for the subscription, plan and registry contracts and the
 * SEP-41 token interface.
 *
 * Reads simulate and never need a wallet. Writes go through `invokeContract`
 * with a `WriteCtx` from the connected Freighter wallet.
 */

import { Asset, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import {
  ContractError,
  NETWORKS,
  arg,
  getEventWindow,
  getServer,
  invokeContract,
  readContract,
  type ErrorTable,
  type WriteCtx,
} from "@/lib/stellar";
import {
  SubStatus,
  type ChargeEvent,
  type Network,
  type Plan,
  type RegistryStats,
  type Subscription,
  type TokenInfo,
  type TxResult,
} from "@/types";

// ---- deployment ----

export interface ContractIds {
  subscription: string;
  plan: string;
  registry: string;
}

const DEPLOYMENTS: Record<Network, ContractIds | null> = {
  testnet: {
    subscription:
      process.env.NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT ||
      "CAW5H4BH5VXWR23DFUVMY45TL7JSMTDZTH3E7LMMXW5LZ7FMDL33KXMM",
    plan:
      process.env.NEXT_PUBLIC_TESTNET_PLAN_CONTRACT ||
      "CDKFRKPA2EIYMW2GX2FY4ZFQ2VAFS5UZD5BHAZLCIGRA7N24N2DFAYN3",
    registry:
      process.env.NEXT_PUBLIC_TESTNET_REGISTRY_CONTRACT ||
      "CB7HBXFNBLUSBY3SMIYUPVTE3JZTISYRMZB7XXPUC3ZPLIDNPTKUX645",
  },
  mainnet:
    process.env.NEXT_PUBLIC_MAINNET_SUBSCRIPTION_CONTRACT &&
    process.env.NEXT_PUBLIC_MAINNET_PLAN_CONTRACT &&
    process.env.NEXT_PUBLIC_MAINNET_REGISTRY_CONTRACT
      ? {
          subscription: process.env.NEXT_PUBLIC_MAINNET_SUBSCRIPTION_CONTRACT,
          plan: process.env.NEXT_PUBLIC_MAINNET_PLAN_CONTRACT,
          registry: process.env.NEXT_PUBLIC_MAINNET_REGISTRY_CONTRACT,
        }
      : null,
};

export function contractsFor(network: Network): ContractIds | null {
  return DEPLOYMENTS[network];
}

export class NotDeployedError extends ContractError {
  constructor(network: Network) {
    super(`Stellar Subscriptions isn't deployed on ${NETWORKS[network].label} yet.`);
    this.name = "NotDeployedError";
  }
}

function ids(network: Network): ContractIds {
  const deployed = DEPLOYMENTS[network];
  if (!deployed) throw new NotDeployedError(network);
  return deployed;
}

/** The Stellar Asset Contract for native XLM on `network`. */
export function nativeTokenId(network: Network): string {
  return Asset.native().contractId(NETWORKS[network].passphrase);
}

// ---- error tables (codes are append-only in the contracts) ----

export const SUBSCRIPTION_ERRORS: ErrorTable = {
  1: "The subscription contract is already set up.",
  2: "The subscription contract hasn't been set up yet.",
  3: "Only the contract admin can do that.",
  4: "The amount per period must be more than zero.",
  5: "The billing interval must be at least one ledger.",
  6: "The cap must cover at least one full charge.",
  7: "You can't subscribe to your own plan.",
  8: "That subscription doesn't exist.",
  9: "Only this subscription's merchant can charge it.",
  10: "Only the subscriber can do that.",
  11: "Too early: this subscription was already charged this period.",
  12: "That charge would go over the cap the subscriber authorized, so the contract refused it.",
  13: "The amounts are too large to add up safely.",
  14: "This subscription was cancelled. No further charges can ever happen.",
  15: "This subscription is paused, so it can't be charged.",
  16: "The full cap has already been charged.",
  17: "This subscription is already paused.",
  18: "This subscription isn't paused.",
  19: "The token transfer failed: the subscriber's balance or spending authorization is too low. Nothing was charged.",
  20: "The token didn't accept the spending authorization. Try again in a moment.",
  21: "That plan doesn't exist.",
  22: "That plan no longer accepts new subscribers.",
  23: "These terms don't match the plan exactly.",
  24: "The contracts are already linked.",
  25: "Plans aren't available on this deployment.",
  26: "The registry couldn't record this change, so nothing was changed.",
};

export const PLAN_ERRORS: ErrorTable = {
  1: "The plan contract is already set up.",
  2: "The plan contract hasn't been set up yet.",
  3: "Only the contract admin can do that.",
  4: "Plan names must be 1 to 64 characters.",
  5: "The amount per period must be more than zero.",
  6: "The billing interval must be at least one ledger.",
  7: "The default cap must cover at least one full charge.",
  8: "That plan doesn't exist.",
  9: "Only the merchant who created this plan can change it.",
  10: "This plan is already inactive.",
  11: "The amounts are too large to add up safely.",
  12: "The registry is already linked.",
  13: "The registry couldn't record the new plan, so it wasn't created.",
};

export const REGISTRY_ERRORS: ErrorTable = {
  1: "The registry is already set up.",
  2: "The registry hasn't been set up yet.",
  3: "Only the registry admin can do that.",
  4: "The registry isn't linked to its contracts yet.",
};

const TOKEN_ERRORS: ErrorTable = {};

// ---- decoding ----

type Raw = Record<string, unknown>;

/** u64 / u32 native values arrive as bigint or number. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new ContractError("A contract value was too large to display.", value.toString());
    }
    return Number(value);
  }
  throw new ContractError("The contract returned an unexpected value.", String(value));
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  throw new ContractError("The contract returned an unexpected amount.", String(value));
}

export function decodeSubscription(raw: Raw): Subscription {
  return {
    id: toNumber(raw.id),
    subscriber: String(raw.subscriber),
    merchant: String(raw.merchant),
    token: String(raw.token),
    amountPerPeriod: toBigInt(raw.amount_per_period),
    intervalLedgers: toNumber(raw.interval_ledgers),
    totalCap: toBigInt(raw.total_cap),
    totalCharged: toBigInt(raw.total_charged),
    startLedger: toNumber(raw.start_ledger),
    lastChargeLedger: toNumber(raw.last_charge_ledger),
    nextChargeLedger: toNumber(raw.next_charge_ledger),
    status: toNumber(raw.status) as SubStatus,
    planId: toNumber(raw.plan_id),
  };
}

export function decodePlan(raw: Raw): Plan {
  return {
    id: toNumber(raw.id),
    merchant: String(raw.merchant),
    name: String(raw.name),
    token: String(raw.token),
    amountPerPeriod: toBigInt(raw.amount_per_period),
    intervalLedgers: toNumber(raw.interval_ledgers),
    defaultCap: toBigInt(raw.default_cap),
    active: Boolean(raw.active),
    createdAt: toNumber(raw.created_at),
  };
}

export function decodeStats(raw: Raw): RegistryStats {
  return {
    totalPlans: toNumber(raw.total_plans),
    totalSubscriptions: toNumber(raw.total_subscriptions),
    activeSubscriptions: toNumber(raw.active_subscriptions),
    totalChargedVolume: toBigInt(raw.total_charged_volume),
  };
}

// ---- subscription reads ----

export async function getSubscription(network: Network, id: number): Promise<Subscription> {
  const raw = await readContract<Raw>(
    network,
    ids(network).subscription,
    "get_subscription",
    [arg.u64(id)],
    SUBSCRIPTION_ERRORS,
  );
  return decodeSubscription(raw);
}

export async function getSubscriptionsBySubscriber(
  network: Network,
  subscriber: string,
): Promise<Subscription[]> {
  const raw = await readContract<Raw[]>(
    network,
    ids(network).subscription,
    "get_by_subscriber",
    [arg.address(subscriber)],
    SUBSCRIPTION_ERRORS,
  );
  return raw.map(decodeSubscription);
}

export async function getSubscriptionsByMerchant(
  network: Network,
  merchant: string,
): Promise<Subscription[]> {
  const raw = await readContract<Raw[]>(
    network,
    ids(network).subscription,
    "get_by_merchant",
    [arg.address(merchant)],
    SUBSCRIPTION_ERRORS,
  );
  return raw.map(decodeSubscription);
}

/** The contract's own answer to "would a charge pass every check right now?" */
export async function isChargeable(network: Network, id: number): Promise<boolean> {
  return Boolean(
    await readContract<boolean>(
      network,
      ids(network).subscription,
      "is_chargeable",
      [arg.u64(id)],
      SUBSCRIPTION_ERRORS,
    ),
  );
}

// ---- plan and registry reads ----

export async function getPlan(network: Network, id: number): Promise<Plan> {
  const raw = await readContract<Raw>(
    network,
    ids(network).plan,
    "get_plan",
    [arg.u64(id)],
    PLAN_ERRORS,
  );
  return decodePlan(raw);
}

export async function getActivePlans(network: Network): Promise<Plan[]> {
  const raw = await readContract<Raw[]>(network, ids(network).plan, "get_active_plans", [], PLAN_ERRORS);
  return raw.map(decodePlan);
}

export async function getPlansByMerchant(network: Network, merchant: string): Promise<Plan[]> {
  const raw = await readContract<Raw[]>(
    network,
    ids(network).plan,
    "get_plans_by_merchant",
    [arg.address(merchant)],
    PLAN_ERRORS,
  );
  return raw.map(decodePlan);
}

export async function getRegistryStats(network: Network): Promise<RegistryStats> {
  const raw = await readContract<Raw>(network, ids(network).registry, "get_stats", [], REGISTRY_ERRORS);
  return decodeStats(raw);
}

// ---- token reads ----

const tokenCache = new Map<string, Promise<TokenInfo>>();

/** Symbol, name and decimals of a SEP-41 token. Cached per network+token. */
export function getTokenInfo(network: Network, token: string): Promise<TokenInfo> {
  const key = `${network}:${token}`;
  let cached = tokenCache.get(key);
  if (!cached) {
    cached = (async () => {
      const [symbol, name, decimals] = await Promise.all([
        readContract<string>(network, token, "symbol", [], TOKEN_ERRORS),
        readContract<string>(network, token, "name", [], TOKEN_ERRORS),
        readContract<number>(network, token, "decimals", [], TOKEN_ERRORS),
      ]);
      // The native asset's SAC reports "native"; people know it as XLM.
      const display = symbol === "native" ? "XLM" : symbol;
      return { contractId: token, symbol: display, name, decimals: Number(decimals) };
    })();
    cached.catch(() => tokenCache.delete(key));
    tokenCache.set(key, cached);
  }
  return cached;
}

export async function getTokenBalance(network: Network, token: string, owner: string): Promise<bigint> {
  return toBigInt(await readContract(network, token, "balance", [arg.address(owner)], TOKEN_ERRORS));
}

/** How much the subscription contract may currently pull from `owner`. */
export async function getSubscriptionAllowance(
  network: Network,
  token: string,
  owner: string,
): Promise<bigint> {
  return toBigInt(
    await readContract(
      network,
      token,
      "allowance",
      [arg.address(owner), arg.address(ids(network).subscription)],
      TOKEN_ERRORS,
    ),
  );
}

// ---- subscription writes ----

export interface SubscribeInput {
  merchant: string;
  token: string;
  amountPerPeriod: bigint;
  intervalLedgers: number;
  totalCap: bigint;
  planId: number;
}

/**
 * Create a subscription. The subscriber signs once: this both records the
 * terms and approves the contract to pull up to the cap from their balance.
 * Returns the new subscription id.
 */
export async function subscribe(ctx: WriteCtx, input: SubscribeInput): Promise<TxResult & { id: number }> {
  const result = await invokeContract(
    ctx,
    ids(ctx.network).subscription,
    "subscribe",
    [
      arg.address(ctx.source),
      arg.address(input.merchant),
      arg.address(input.token),
      arg.i128(input.amountPerPeriod),
      arg.u32(input.intervalLedgers),
      arg.i128(input.totalCap),
      arg.u64(input.planId),
    ],
    SUBSCRIPTION_ERRORS,
  );
  return { ...result, id: toNumber(result.returnValue) };
}

/**
 * Charge one period. Asks the contract `is_chargeable` first, on-chain, so
 * the merchant is never asked to sign a charge the contract would refuse.
 */
export async function charge(ctx: WriteCtx, subscriptionId: number): Promise<TxResult> {
  ctx.onPhase?.("checking");
  if (!(await isChargeable(ctx.network, subscriptionId))) {
    throw new ContractError(
      "This subscription isn't chargeable right now: it's paused, cancelled, fully charged, or not due yet. Nothing was sent.",
    );
  }
  return invokeContract(
    ctx,
    ids(ctx.network).subscription,
    "charge",
    [arg.address(ctx.source), arg.u64(subscriptionId)],
    SUBSCRIPTION_ERRORS,
  );
}

function subscriberCall(method: "cancel" | "pause" | "resume") {
  return (ctx: WriteCtx, subscriptionId: number): Promise<TxResult> =>
    invokeContract(
      ctx,
      ids(ctx.network).subscription,
      method,
      [arg.address(ctx.source), arg.u64(subscriptionId)],
      SUBSCRIPTION_ERRORS,
    );
}

export const cancelSubscription = subscriberCall("cancel");
export const pauseSubscription = subscriberCall("pause");
export const resumeSubscription = subscriberCall("resume");

/** Re-approve the outstanding cap for `token` after the approval expired. */
export function refreshAllowance(ctx: WriteCtx, token: string): Promise<TxResult> {
  return invokeContract(
    ctx,
    ids(ctx.network).subscription,
    "refresh_allowance",
    [arg.address(ctx.source), arg.address(token)],
    SUBSCRIPTION_ERRORS,
  );
}

// ---- plan writes ----

export interface CreatePlanInput {
  name: string;
  token: string;
  amountPerPeriod: bigint;
  intervalLedgers: number;
  defaultCap: bigint;
}

export async function createPlan(ctx: WriteCtx, input: CreatePlanInput): Promise<TxResult & { id: number }> {
  const result = await invokeContract(
    ctx,
    ids(ctx.network).plan,
    "create_plan",
    [
      arg.address(ctx.source),
      arg.string(input.name),
      arg.address(input.token),
      arg.i128(input.amountPerPeriod),
      arg.u32(input.intervalLedgers),
      arg.i128(input.defaultCap),
    ],
    PLAN_ERRORS,
  );
  return { ...result, id: toNumber(result.returnValue) };
}

export function deactivatePlan(ctx: WriteCtx, planId: number): Promise<TxResult> {
  return invokeContract(
    ctx,
    ids(ctx.network).plan,
    "deactivate_plan",
    [arg.address(ctx.source), arg.u64(planId)],
    PLAN_ERRORS,
  );
}

// ---- events ----

const PAGE_SIZE = 200;
/**
 * RPC nodes scan roughly 10,000 ledgers per request, so a full ~7-day window
 * takes about 13 pages. This bounds the walk if a node behaves differently.
 */
const MAX_PAGES = 40;
/**
 * The node's oldest retained ledger advances every few seconds; starting a
 * little inside the window avoids "startLedger must be within the ledger
 * range" when it moves between our two requests.
 */
const WINDOW_MARGIN = 200;

/**
 * The ledger an events cursor points at. Cursors are
 * `<TOID>-<event index>`, and a TOID keeps the ledger sequence in its top 32
 * bits.
 */
export function cursorLedger(cursor: string): number {
  return Number(BigInt(cursor.split("-")[0]) >> 32n);
}

export function decodeChargeEvent(event: rpc.Api.EventResponse): ChargeEvent {
  const data = scValToNative(event.value) as Raw;
  return {
    subscriptionId: toNumber(scValToNative(event.topic[1])),
    merchant: String(scValToNative(event.topic[2])),
    amount: toBigInt(data.amount),
    totalCharged: toBigInt(data.total_charged),
    exhausted: Boolean(data.exhausted),
    ledger: event.ledger,
    closedAt: new Date(event.ledgerClosedAt),
    txHash: event.txHash,
  };
}

/**
 * Every `charged` event paid to `merchant` that the RPC node still holds.
 * RPC nodes keep a limited window of recent ledgers, so this is recent
 * history, not all-time history; `fromLedger` says where the window starts.
 */
export async function getChargeEvents(
  network: Network,
  merchant: string,
): Promise<{ events: ChargeEvent[]; fromLedger: number }> {
  const server = getServer(network);
  const { oldest } = await getEventWindow(network);
  const filters: rpc.Api.EventFilter[] = [
    {
      type: "contract",
      contractIds: [ids(network).subscription],
      topics: [
        [
          nativeToScVal("charged", { type: "symbol" }).toXDR("base64"),
          "*",
          arg.address(merchant).toXDR("base64"),
        ],
      ],
    },
  ];

  const fromLedger = oldest + WINDOW_MARGIN;
  const events: ChargeEvent[] = [];
  let page = await server.getEvents({ startLedger: fromLedger, filters, limit: PAGE_SIZE });
  events.push(...page.events.map(decodeChargeEvent));
  // A short or even empty page only means this request's scan range ended,
  // so keep following the cursor until it reaches the latest ledger.
  for (let n = 1; n < MAX_PAGES && cursorLedger(page.cursor) < page.latestLedger; n++) {
    page = await server.getEvents({ cursor: page.cursor, filters, limit: PAGE_SIZE });
    events.push(...page.events.map(decodeChargeEvent));
  }
  return { events, fromLedger };
}

/** Re-exported so callers can tell a contract rejection from other failures. */
export { ContractError };
export type { xdr };
