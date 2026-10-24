import { explainError } from "./stellar";
import {
  SUBSCRIPTION_ERRORS,
  contractsFor,
  cursorLedger,
  decodePlan,
  decodeStats,
  decodeSubscription,
  getChargeEvents,
  toNumber,
} from "./contracts";
import { SubStatus } from "@/types";

const mockGetEvents = jest.fn();
const mockGetHealth = jest.fn();

jest.mock("@stellar/stellar-sdk", () => {
  const actual = jest.requireActual("@stellar/stellar-sdk");
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: jest.fn().mockImplementation(() => ({
        getEvents: mockGetEvents,
        getHealth: mockGetHealth,
      })),
    },
  };
});

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

const USDC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

function chargedEvent(opts: {
  id: string;
  ledger: number;
  subscriber?: string;
  token?: string;
  amount: bigint;
}) {
  return {
    id: opts.id,
    type: "contract",
    ledger: opts.ledger,
    ledgerClosedAt: new Date(Date.UTC(2025, 0, 1)).toISOString(),
    contractId: "CSUBSCRIPTION",
    topic: [
      { value: () => "charged" },
      { value: () => opts.subscriber ?? SUBSCRIBER },
    ],
    value: {
      value: () => ({
        amount: opts.amount,
        token: opts.token ?? XLM,
      }),
    },
    txHash: "abc",
    pagingToken: opts.id,
  };
}

describe("getChargeEvents", () => {
  beforeEach(() => {
    mockGetEvents.mockReset();
    mockGetHealth.mockReset();
    mockGetHealth.mockResolvedValue({ oldestLedger: 4_000_000 });
  });

  it("decodes charged events and reports where history starts", async () => {
    mockGetEvents.mockResolvedValueOnce({
      events: [
        chargedEvent({ id: "1-1", ledger: 4_100_000, amount: 10_000_000n }),
        chargedEvent({ id: "1-2", ledger: 4_100_100, amount: 5_000_000n }),
      ],
      cursor: "1-2",
    });

    const result = await getChargeEvents({ merchant: MERCHANT, network: "testnet" });

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      subscriber: SUBSCRIBER,
      token: XLM,
      amount: 10_000_000n,
      ledger: 4_100_000,
    });
    expect(result.events[1].amount).toBe(5_000_000n);
    // fromLedger is the node's oldest ledger plus a safety margin.
    expect(result.fromLedger).toBeGreaterThan(4_000_000);
    expect(result.fromLedger).toBeLessThanOrEqual(4_100_000);
  });

  it("follows the cursor across pages", async () => {
    mockGetEvents
      .mockResolvedValueOnce({
        events: [chargedEvent({ id: "1-1", ledger: 4_100_000, amount: 1n })],
        cursor: "1-1",
      })
      .mockResolvedValueOnce({
        events: [chargedEvent({ id: "1-2", ledger: 4_100_100, amount: 2n })],
        cursor: "1-2",
      })
      .mockResolvedValueOnce({ events: [], cursor: "1-2" });

    const result = await getChargeEvents({ merchant: MERCHANT, network: "testnet" });

    expect(result.events.map((e) => e.amount)).toEqual([1n, 2n]);
    expect(mockGetEvents.mock.calls[1][0].cursor).toBe("1-1");
  });

  it("keeps events for different tokens separate", async () => {
    mockGetEvents.mockResolvedValueOnce({
      events: [
        chargedEvent({ id: "1-1", ledger: 4_100_000, token: XLM, amount: 10_000_000n }),
        chargedEvent({ id: "1-2", ledger: 4_100_100, token: USDC, amount: 3_000_000n }),
      ],
      cursor: "1-2",
    });

    const result = await getChargeEvents({ merchant: MERCHANT, network: "testnet" });

    expect(result.events).toHaveLength(2);
    expect(result.events[0].token).toBe(XLM);
    expect(result.events[1].token).toBe(USDC);
    expect(result.events[0].amount).toBe(10_000_000n);
    expect(result.events[1].amount).toBe(3_000_000n);
  });
});
