export type Network = "testnet" | "mainnet";

/**
 * Mirrors the subscription contract's `SubStatus` discriminants, which are
 * part of that contract's interface and never renumbered.
 */
export enum SubStatus {
  Active = 0,
  Paused = 1,
  Cancelled = 2,
  Exhausted = 3,
}

/** A subscriber's bounded, revocable authorization, as stored on-chain. */
export interface Subscription {
  id: number;
  subscriber: string;
  merchant: string;
  token: string;
  amountPerPeriod: bigint;
  intervalLedgers: number;
  totalCap: bigint;
  totalCharged: bigint;
  startLedger: number;
  /** 0 until the first charge. */
  lastChargeLedger: number;
  /** Earliest ledger at which the contract accepts the next charge. */
  nextChargeLedger: number;
  status: SubStatus;
  /** 0 for a subscription created without a plan. */
  planId: number;
}

/** A merchant's reusable billing terms. */
export interface Plan {
  id: number;
  merchant: string;
  name: string;
  token: string;
  amountPerPeriod: bigint;
  intervalLedgers: number;
  /** The merchant's suggested cap. Subscribers choose their own. */
  defaultCap: bigint;
  active: boolean;
  createdAt: number;
}

export interface RegistryStats {
  totalPlans: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  /** Raw token units summed across every token. An activity signal, not a price. */
  totalChargedVolume: bigint;
}

/** SEP-41 token metadata read from the token contract. */
export interface TokenInfo {
  contractId: string;
  symbol: string;
  name: string;
  decimals: number;
}

/** One successful charge, decoded from a `charged` contract event. */
export interface ChargeEvent {
  subscriptionId: number;
  merchant: string;
  amount: bigint;
  totalCharged: bigint;
  exhausted: boolean;
  ledger: number;
  closedAt: Date;
  txHash: string;
}

export type TxPhase =
  | "idle"
  | "checking"
  | "building"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

export interface TxResult {
  hash: string;
  returnValue?: unknown;
}
