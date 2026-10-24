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

// ---- token metadata cache ----

const TOKEN_CACHE_PREFIX = "stellar-subs:token:";
const TOKEN_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedToken {
  info: TokenInfo;
  expiresAt: number;
}

function tokenCacheKey(network: Network, token: string): string {
  return `${TOKEN_CACHE_PREFIX}${network}:${token}`;
}

function readTokenCache(network: Network, token: string): TokenInfo | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(tokenCacheKey(network, token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedToken;
    if (
      !parsed ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < Date.now() ||
      !parsed.info ||
      typeof parsed.info.symbol !== "string" ||
      typeof parsed.info.name !== "string" ||
      typeof parsed.info.decimals !== "number"
    ) {
      return null;
    }
    return parsed.info;
  } catch {
    return null;
  }
}

function writeTokenCache(network: Network, token: string, info: TokenInfo): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const entry: CachedToken = { info, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS };
    window.localStorage.setItem(tokenCacheKey(network, token), JSON.stringify(entry));
  } catch {
    // Storage unavailable, quota exceeded, or serialization failed: ignore.
  }
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
    "get_by_merchan

/* … truncated 9169 chars — edit only what you need near the top … */
