import { explainError } from "./stellar";
import {
  SUBSCRIPTION_ERRORS,
  contractsFor,
  cursorLedger,
  decodePlan,
  decodeStats,
  decodeSubscription,
  toNumber,
} from "./contracts";
import { SubStatus } from "@/types";

describe("event paging", () => {
  it("reads the ledger a cursor points at", () => {
    // A cursor returned by the Testnet RPC while scanning for charges.
    expect(cursorLedger("0019901701628624895-4294967295")).toBe(4_633_725);
  });
});

const SUBSCRIBER = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";
const MERCHANT = "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU";
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

describe("decoders", () => {
  it("decodes a subscription as returned by scValToNative", () => {
    const sub = decodeSubscription({
      id: 1n,
      subscriber: SUBSCRIBER,
      merchant: MERCHANT,
      token: XLM,
      amount_per_period: 10_000_000n,
      interval_ledgers: 720,
      total_cap: 120_000_000n,
      total_charged: 10_000_000n,
      start_ledger: 4_692_992,
      last_charge_ledger: 4_692_994,
      next_charge_ledger: 4_693_714,
      status: 0,
      plan_id: 1n,
    });
    expect(sub).toEqual({
      id: 1,
      subscriber: SUBSCRIBER,
      merchant: MERCHANT,
      token: XLM,
      amountPerPeriod: 10_000_000n,
      intervalLedgers: 720,
      totalCap: 120_000_000n,
      totalCharged: 10_000_000n,
      startLedger: 4_692_992,
      lastChargeLedger: 4_692_994,
      nextChargeLedger: 4_693_714,
      status: SubStatus.Active,
      planId: 1,
    });
  });

  it("decodes a plan", () => {
    const plan = decodePlan({
      id: 3n,
      merchant: MERCHANT,
      name: "Demo hourly",
      token: XLM,
      amount_per_period: 10_000_000n,
      interval_ledgers: 720,
      default_cap: 120_000_000n,
      active: true,
      created_at: 4_692_990,
    });
    expect(plan.id).toBe(3);
    expect(plan.name).toBe("Demo hourly");
    expect(plan.defaultCap).toBe(120_000_000n);
    expect(plan.active).toBe(true);
  });

  it("decodes registry stats", () => {
    expect(
      decodeStats({
        total_plans: 1n,
        total_subscriptions: 2n,
        active_subscriptions: 1n,
        total_charged_volume: 10_000_000n,
      }),
    ).toEqual({
      totalPlans: 1,
      totalSubscriptions: 2,
      activeSubscriptions: 1,
      totalChargedVolume: 10_000_000n,
    });
  });

  it("refuses ids too large to represent exactly", () => {
    expect(() => toNumber(2n ** 60n)).toThrow(/too large/);
  });
});

describe("contract errors", () => {
  it("explains the invariant rejections in plain language", () => {
    expect(explainError("HostError: Error(Contract, #12)", SUBSCRIPTION_ERRORS).message).toMatch(
      /over the cap/,
    );
    expect(explainError("Error(Contract, #11)", SUBSCRIPTION_ERRORS).message).toMatch(/Too early/);
    expect(explainError("Error(Contract, #14)", SUBSCRIPTION_ERRORS).message).toMatch(
      /No further charges can ever happen/,
    );
  });

  it("keeps the code and raw detail", () => {
    const err = explainError("Error(Contract, #9)", SUBSCRIPTION_ERRORS);
    expect(err.code).toBe(9);
    expect(err.detail).toBe("Error(Contract, #9)");
  });

  it("falls back for unknown codes", () => {
    expect(explainError("Error(Contract, #99)", SUBSCRIPTION_ERRORS).message).toMatch(/error 99/);
  });
});

describe("deployments", () => {
  it("has Testnet contracts and no Mainnet deployment by default", () => {
    expect(contractsFor("testnet")?.subscription).toMatch(/^C[A-Z0-9]{55}$/);
    expect(contractsFor("mainnet")).toBeNull();
  });
});
