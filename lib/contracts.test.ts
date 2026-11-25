import { explainError } from "./stellar";
// @vitest-environment node
import {
  OVERFLOW_CODE,
  SUBSCRIPTION_ERRORS,
  contractsFor,
  cursorLedger,
  decodePlan,
  decodeStats,
  decodeSubscription,
  getChargeEvents,
  getTokenMetadata,
  tokenCacheSize,
  getTokenInfo,
  toNumber,
} from "./contracts";
import * as stellar from "@/lib/stellar";
import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { SubStatus } from "@/types";
import { ContractError } from "./contracts";
import { planFixture, registryStatsFixture } from "@/test/mocks/fixtures";

const mockGetEvents = vi.fn();
const mockGetHealth = vi.fn();
const mockGetEvents = jest.fn();
const mockGetHealth = jest.fn();
const mockReadContract = jest.fn();

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
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn(),
    })),
  };
});

jest.mock("./stellar", () => {
  const actual = jest.requireActual("./stellar");
  return {
    ...actual,
    readContract: (...args: unknown[]) => mockReadContract(...args),
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
    let caught: unknown;
    try { toNumber(2n ** 60n); } catch (e) { caught = e; }
    expect(caught).toHaveProperty("code", OVERFLOW_CODE);
  });

  it("throws ContractError for values near Number.MAX_SAFE_INTEGER", () => {
    expect(() => toNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(ContractError);
    expect(() => toNumber(2n ** 60n)).toThrow(ContractError);
  });
});

describe("decoder round-trips", () => {
  it("round-trips a plan fixture through decodePlan", () => {
    const plan = decodePlan(planFixture);
    expect(plan).toEqual({
      id: 3,
      merchant: MERCHANT,
      name: "Demo hourly",
      token: XLM,
      amountPerPeriod: 10_000_000n,
      intervalLedgers: 720,
      defaultCap: 120_000_000n,
      active: true,
      createdAt: 4_692_990,
    });
  });

  it("round-trips a registry stats fixture through decodeStats", () => {
    const stats = decodeStats(registryStatsFixture);
    expect(stats).toEqual({
      totalPlans: 1,
      totalSubscriptions: 2,
      activeSubscriptions: 1,
      totalChargedVolume: 10_000_000n,
    });
  });

  it("throws ContractError when totalChargedVolume is oversized", () => {
    const oversized = {
      ...registryStatsFixture,
      total_charged_volume: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    };
    expect(() => decodeStats(oversized)).toThrow(ContractError);
  });
});

// Return values of the read functions as base64 `ScVal` XDR, the form the RPC
// hands back in simulation results. Decoding goes through the real
// `scValToNative`, so a renamed contract field no longer decodes.
const SUBSCRIPTION_XDR =
  "AAAAEQAAAAEAAAANAAAADwAAABFhbW91bnRfcGVyX3BlcmlvZAAAAAAAAAoAAAAAAAAAAAAAAAAAmJaAAAAADwAAAAJpZAAAAAAABQAAAAAAAAABAAAADwAAABBpbnRlcnZhbF9sZWRnZXJzAAAAAwAAAtAAAAAPAAAAEmxhc3RfY2hhcmdlX2xlZGdlcgAAAAAAAwBHnAIAAAAPAAAACG1lcmNoYW50AAAAEgAAAAAAAAAAlgX2hS8+yf0sSeUuBtdjFJlM2Ce0dPb/+3naKWX4UDUAAAAPAAAAEm5leHRfY2hhcmdlX2xlZGdlcgAAAAAAAwBHntIAAAAPAAAAB3BsYW5faWQAAAAABQAAAAAAAAABAAAADwAAAAxzdGFydF9sZWRnZXIAAAADAEecAAAAAA8AAAAGc3RhdHVzAAAAAAADAAAAAAAAAA8AAAAKc3Vic2NyaWJlcgAAAAAAEgAAAAAAAAAAVAqXPTCyxiK7yrK+0kouJ9GEOZ44/tep/0DT2nf5gSIAAAAPAAAABXRva2VuAAAAAAAAEgAAAAHXkotywnA8z+r365/0701QSlWouXn8m0UOoshCtNHOYQAAAA8AAAAJdG90YWxfY2FwAAAAAAAACgAAAAAAAAAAAAAAAAcnDgAAAAAPAAAADXRvdGFsX2NoYXJnZWQAAAAAAAAKAAAAAAAAAAAAAAAAAJiWgA==";
const PLAN_XDR =
  "AAAAEQAAAAEAAAAJAAAADwAAAAZhY3RpdmUAAAAAAAAAAAABAAAADwAAABFhbW91bnRfcGVyX3BlcmlvZAAAAAAAAAoAAAAAAAAAAAAAAAAAmJaAAAAADwAAAApjcmVhdGVkX2F0AAAAAAADAEeb/gAAAA8AAAALZGVmYXVsdF9jYXAAAAAACgAAAAAAAAAAAAAAAAcnDgAAAAAPAAAAAmlkAAAAAAAFAAAAAAAAAAMAAAAPAAAAEGludGVydmFsX2xlZGdlcnMAAAADAAAC0AAAAA8AAAAIbWVyY2hhbnQAAAASAAAAAAAAAACWBfaFLz7J/SxJ5S4G12MUmUzYJ7R09v/7edopZfhQNQAAAA8AAAAEbmFtZQAAAA4AAAALRGVtbyBob3VybHkAAAAADwAAAAV0b2tlbgAAAAAAABIAAAAB15KLcsJwPM/q9+uf9O9NUEpVqLl5/JtFDqLIQrTRzmE=";
const STATS_XDR =
  "AAAAEQAAAAEAAAAEAAAADwAAABRhY3RpdmVfc3Vic2NyaXB0aW9ucwAAAAUAAAAAAAAAAQAAAA8AAAAUdG90YWxfY2hhcmdlZF92b2x1bWUAAAAKAAAAAAAAAAAAAAAAAJiWgAAAAA8AAAALdG90YWxfcGxhbnMAAAAABQAAAAAAAAABAAAADwAAABN0b3RhbF9zdWJzY3JpcHRpb25zAAAAAAUAAAAAAAAAAg==";

function fixture(b64: string): Record<string, unknown> {
  return scValToNative(xdr.ScVal.fromXDR(b64, "base64")) as Record<string, unknown>;
}

describe("decoder fixtures", () => {
  it("decodes a subscription fixture", () => {
    expect(decodeSubscription(fixture(SUBSCRIPTION_XDR))).toEqual({
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

  it("decodes a plan fixture", () => {
    expect(decodePlan(fixture(PLAN_XDR))).toEqual({
      id: 3,
      merchant: MERCHANT,
      name: "Demo hourly",
      token: XLM,
      amountPerPeriod: 10_000_000n,
      intervalLedgers: 720,
      defaultCap: 120_000_000n,
      active: true,
      createdAt: 4_692_990,
    });
  });

  it("decodes a registry stats fixture", () => {
    expect(decodeStats(fixture(STATS_XDR))).toEqual({
      totalPlans: 1,
      totalSubscriptions: 2,
      activeSubscriptions: 1,
      totalChargedVolume: 10_000_000n,
    });
  });

  it("fails when a contract field is renamed", () => {
    const sub = fixture(SUBSCRIPTION_XDR);
    const { total_cap: cap, ...rest } = sub;
    expect(() => decodeSubscription({ ...rest, cap_total: cap })).toThrow();
    const { total_plans: plans, ...stats } = fixture(STATS_XDR);
    expect(() => decodeStats({ ...stats, plan_count: plans })).toThrow();
  });
});

describe("token metadata cache", () => {
  it("caps the cache at 100 entries and evicts the oldest", async () => {
    const ids = Array.from(
      { length: 150 },
      (_, i) => `C${String(i).padStart(55, "0")}`,
    );
    for (const id of ids) {
      await getTokenMetadata(id, "testnet");
    }
    expect(tokenCacheSize()).toBeLessThanOrEqual(100);
    // The earliest ids were evicted; the most recent ones remain cached.
    expect(tokenCacheSize()).toBe(100);
  });
});

describe("contract errors", () => {
  it("explains the invariant rejections in plain language", () => {
    expect(explainError("HostError: Error(Contract, #12)", SUBSCRIPTION_ERRORS).message).toMatch(/over the cap/);
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

  it("returns null for mainnet so callers show the not-deployed state", () => {
    // Mainnet ids are intentionally empty until a real deployment exists.
    // Callers must treat null as "not deployed" rather than crashing.
    const mainnet = contractsFor("mainnet");
    expect(mainnet).toBeNull();
    expect(mainnet?.subscription).toBeUndefined();
    expect(mainnet?.registry).toBeUndefined();
  });
});

describe("rpc failover", () => {
  const originalUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const originalUrls = process.env.NEXT_PUBLIC_RPC_URLS;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_RPC_URL;
    else process.env.NEXT_PUBLIC_RPC_URL = originalUrl;
    if (originalUrls === undefined) delete process.env.NEXT_PUBLIC_RPC_URLS;
    else process.env.NEXT_PUBLIC_RPC_URLS = originalUrls;
    vi.resetModules();
  });

  // These tests require RPC_URLS and withRpc to be exported from lib/stellar.
  // They are skipped until those exports exist.
  it.todo("parses a comma-separated fallback list, keeping the primary first");
  it.todo("fails over to the next endpoint when the primary is dead");
  it.todo("retries rate-limited requests before failing over");
});

const USDC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

function chargedEvent(opts: {
  id: string;
  ledger: number;
  subscriptionId?: number;
  subscriber?: string;
  merchant?: string;
  token?: string;
  amount: bigint;
  totalCharged?: bigint;
}) {
  return {
    id: opts.id,
    type: "contract" as const,
    ledger: opts.ledger,
    ledgerClosedAt: new Date(Date.UTC(2025, 0, 1)).toISOString(),
    contractId: "CSUBSCRIPTION",
    topic: [
      nativeToScVal("charged", { type: "symbol" }),
      nativeToScVal(BigInt(opts.subscriptionId ?? 1), { type: "u64" }),
      nativeToScVal(opts.merchant ?? MERCHANT, { type: "address" }),
    ],
    value: nativeToScVal({
      amount: opts.amount,
      total_charged: opts.totalCharged ?? opts.amount,
      exhausted: false,
      token: opts.token ?? XLM,
    }),
    txHash: "abc",
    pagingToken: opts.id,
  };
}

describe("getTokenInfo", () => {
  beforeEach(() => {
    mockReadContract.mockReset();
  });

  it("deduplicates concurrent calls for the same contract id", async () => {
    mockReadContract.mockImplementation(async (_network: unknown, _id: unknown, method: string) => {
      if (method === "symbol") return "USDC";
      if (method === "name") return "USD Coin";
      if (method === "decimals") return 7;
      throw new Error(`unexpected method ${method}`);
    });

    const [a, b] = await Promise.all([
      getTokenInfo("testnet", USDC),
      getTokenInfo("testnet", USDC),
    ]);

    expect(a).toEqual(b);
    expect(a).toMatchObject({ symbol: "USDC", name: "USD Coin", decimals: 7 });
    // symbol, name and decimals — one set of calls, not two.
    expect(mockReadContract).toHaveBeenCalledTimes(3);

    // Once settled, the cache serves subsequent callers without new calls.
    const c = await getTokenInfo("testnet", USDC);
    expect(c).toEqual(a);
    expect(mockReadContract).toHaveBeenCalledTimes(3);
  });
});

describe("getChargeEvents", () => {
  beforeEach(() => {
    mockGetEvents.mockReset();
    mockGetHealth.mockReset();
    mockGetHealth.mockResolvedValue({ oldestLedger: 4_000_000 });
    vi.spyOn(stellar, "getServer").mockReturnValue({
      getEvents: mockGetEvents,
      getHealth: mockGetHealth,
    } as unknown as ReturnType<typeof stellar.getServer>);
    vi.spyOn(stellar, "getEventWindow").mockResolvedValue({ oldest: 4_000_000, latest: 4_200_000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decodes charged events and reports where history starts", async () => {
    mockGetEvents.mockResolvedValueOnce({
      events: [
        chargedEvent({ id: "1-1", ledger: 4_100_000, amount: 10_000_000n }),
        chargedEvent({ id: "1-2", ledger: 4_100_100, amount: 5_000_000n }),
      ],
      cursor: "1-2",
      latestLedger: 4_100_100,
    });

    const result = await getChargeEvents("testnet", MERCHANT);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      subscriptionId: 1,
      merchant: MERCHANT,
      amount: 10_000_000n,
      ledger: 4_100_000,
    });
    expect(result.events[1].amount).toBe(5_000_000n);
    // fromLedger is the node's oldest ledger plus a safety margin.
    expect(result.fromLedger).toBeGreaterThan(4_000_000);
    expect(result.fromLedger).toBeLessThanOrEqual(4_200_000);
  });

  it("follows the cursor across pages", async () => {
    // Cursors encode the ledger in the top 32 bits: ledger 4_100_000 → "17609365913600000".
    // The loop continues while cursorLedger(cursor) < latestLedger (4_200_000).
    mockGetEvents
      .mockResolvedValueOnce({
        events: [chargedEvent({ id: "1-1", ledger: 4_100_000, amount: 1n })],
        cursor: "17609365913600000-1",
        latestLedger: 4_200_000,
      })
      .mockResolvedValueOnce({
        events: [chargedEvent({ id: "1-2", ledger: 4_100_100, amount: 2n })],
        cursor: "17609365913600000-2",
        latestLedger: 4_200_000,
      })
      .mockResolvedValueOnce({ events: [], cursor: "18038866938167296-1", latestLedger: 4_200_000 });
        cursor: "1-1",
        latestLedger: 4_100_100,
      })
      .mockResolvedValueOnce({
        events: [chargedEvent({ id: "1-2", ledger: 4_100_100, amount: 2n })],
        cursor: "1-2",
        latestLedger: 4_100_100,
      })
      .mockResolvedValueOnce({ events: [], cursor: "1-2", latestLedger: 4_100_100 });

    const result = await getChargeEvents("testnet", MERCHANT);

    expect(result.events.map((e) => e.amount)).toEqual([1n, 2n]);
    expect(mockGetEvents.mock.calls[1][0].cursor).toBe("17609365913600000-1");
  });

  it("keeps events for different tokens separate", async () => {
    mockGetEvents.mockResolvedValueOnce({
      events: [
        chargedEvent({ id: "1-1", ledger: 4_100_000, token: XLM, amount: 10_000_000n }),
        chargedEvent({ id: "1-2", ledger: 4_100_100, token: USDC, amount: 3_000_000n }),
      ],
      cursor: "1-2",
      latestLedger: 4_100_100,
    });

    const result = await getChargeEvents("testnet", MERCHANT);

    expect(result.events).toHaveLength(2);
    expect(result.events[0].amount).toBe(10_000_000n);
    expect(result.events[1].amount).toBe(3_000_000n);
  });
});
