/**
 * Fixed chain data for the visual tests. Everything on screen comes from here,
 * so a screenshot never depends on the live network or on today's date.
 *
 * Addresses are derived from fixed seeds: they are valid Stellar strkeys but
 * belong to no real account or contract.
 */

import { Asset, Keypair, Networks, StrKey } from "@stellar/stellar-sdk";

const account = (seed: number) => Keypair.fromRawEd25519Seed(Buffer.alloc(32, seed)).publicKey();
const contract = (seed: number) => StrKey.encodeContract(Buffer.alloc(32, seed));

export const SUBSCRIBER = account(1);
export const MERCHANT_ONE = account(2);
export const MERCHANT_TWO = account(3);

export const NATIVE_TOKEN = Asset.native().contractId(Networks.TESTNET);
export const USDC_TOKEN = contract(9);

/** The ledger every "latest ledger" read reports, and the base for countdowns. */
export const LEDGER = 10_000_000;
const DAY = 17_280;

/** SEP-41 metadata. The native asset reports the symbol "native", as on-chain. */
export const TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  [NATIVE_TOKEN]: { symbol: "native", name: "native", decimals: 7 },
  [USDC_TOKEN]: { symbol: "USDC", name: "USD Coin", decimals: 7 },
};

export const STATS = {
  total_plans: 12n,
  total_subscriptions: 48n,
  active_subscriptions: 31n,
  total_charged_volume: 1_234_567_890_000n,
};

export const PLANS = [
  {
    id: 1,
    merchant: MERCHANT_ONE,
    name: "Studio monthly",
    token: USDC_TOKEN,
    amount_per_period: 125_000_000n,
    interval_ledgers: 30 * DAY,
    default_cap: 1_500_000_000n,
    active: true,
    created_at: LEDGER - 200 * DAY,
  },
  {
    id: 2,
    merchant: MERCHANT_TWO,
    name: "Weekly digest",
    token: NATIVE_TOKEN,
    amount_per_period: 50_000_000n,
    interval_ledgers: 7 * DAY,
    default_cap: 2_600_000_000n,
    active: true,
    created_at: LEDGER - 120 * DAY,
  },
];

/** One of each state a subscriber can see: active, due now, paused, cancelled. */
export const SUBSCRIPTIONS = [
  {
    id: 4,
    subscriber: SUBSCRIBER,
    merchant: MERCHANT_ONE,
    token: USDC_TOKEN,
    amount_per_period: 125_000_000n,
    interval_ledgers: 30 * DAY,
    total_cap: 1_500_000_000n,
    total_charged: 375_000_000n,
    start_ledger: LEDGER - 80 * DAY,
    last_charge_ledger: LEDGER - 27 * DAY,
    next_charge_ledger: LEDGER + 3 * DAY,
    status: 0,
    plan_id: 1,
  },
  {
    id: 3,
    subscriber: SUBSCRIBER,
    merchant: MERCHANT_TWO,
    token: NATIVE_TOKEN,
    amount_per_period: 50_000_000n,
    interval_ledgers: 7 * DAY,
    total_cap: 2_600_000_000n,
    total_charged: 200_000_000n,
    start_ledger: LEDGER - 30 * DAY,
    last_charge_ledger: LEDGER - 8 * DAY,
    next_charge_ledger: LEDGER - DAY,
    status: 0,
    plan_id: 2,
  },
  {
    id: 2,
    subscriber: SUBSCRIBER,
    merchant: MERCHANT_TWO,
    token: USDC_TOKEN,
    amount_per_period: 20_000_000n,
    interval_ledgers: DAY,
    total_cap: 600_000_000n,
    total_charged: 140_000_000n,
    start_ledger: LEDGER - 40 * DAY,
    last_charge_ledger: LEDGER - 33 * DAY,
    next_charge_ledger: LEDGER - 32 * DAY,
    status: 1,
    plan_id: 0,
  },
  {
    id: 1,
    subscriber: SUBSCRIBER,
    merchant: MERCHANT_ONE,
    token: NATIVE_TOKEN,
    amount_per_period: 100_000_000n,
    interval_ledgers: 30 * DAY,
    total_cap: 1_200_000_000n,
    total_charged: 300_000_000n,
    start_ledger: LEDGER - 120 * DAY,
    last_charge_ledger: LEDGER - 35 * DAY,
    next_charge_ledger: LEDGER - 5 * DAY,
    status: 2,
    plan_id: 0,
  },
];
