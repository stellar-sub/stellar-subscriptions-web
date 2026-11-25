import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cursorLedger, explainError, withRetry } from "./stellar";
import { LEDGER_SECONDS as FORMAT_LEDGER_SECONDS } from "./format";
import { LEDGER_SECONDS } from "./stellar";
import { explainError, walkEvents, withRetry } from "./stellar";
import { ContractError, explainError, readContract, withRetry } from "./stellar";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries transient rate-limit errors up to three times", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("rate limit exceeded"));
    const promise = withRetry(fn);
    const assertion = expect(promise).rejects.toThrow(/rate limit/i);

    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries transient network errors up to three times", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("network error"));
    const promise = withRetry(fn);
    const assertion = expect(promise).rejects.toThrow(/network/i);

    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("applies backoff between retries using fake timers", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("rate limit exceeded"));
    const promise = withRetry(fn);
    const assertion = expect(promise).rejects.toThrow(/rate limit/i);

    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("never retries contract errors and throws on the first attempt", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("contract error: cap exceeded"));
    const promise = withRetry(fn);
    const assertion = expect(promise).rejects.toThrow(/contract error/i);

    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("readContract", () => {
  it("rejects malformed contract ids without a network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(readContract("not-a-contract-id")).rejects.toThrow(ContractError);
    await expect(readContract("not-a-contract-id")).rejects.toThrow(/Invalid contract id/);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("explainError", () => {
  it("explains known error codes", () => {
    expect(explainError("RATE_LIMIT")).toMatch(/rate limit/i);
  });

  it("falls back gracefully for unknown codes", () => {
    const message = explainError("SOME_UNKNOWN_CODE");
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });

  it("explains balance-style messages", () => {
    expect(explainError("insufficient balance")).toMatch(/balance/i);
  });
});

describe("cursorLedger", () => {
  it("returns 0 for malformed cursor strings without throwing", () => {
    expect(() => cursorLedger("bad-cursor")).not.toThrow();
    expect(cursorLedger("bad-cursor")).toBe(0);
    expect(() => cursorLedger("")).not.toThrow();
    expect(cursorLedger("")).toBe(0);
    expect(() => cursorLedger("not-a-number-0")).not.toThrow();
    expect(cursorLedger("not-a-number-0")).toBe(0);
  });

  it("decodes a valid cursor correctly", () => {
    const ledger = 12345;
    const cursor = `${ledger}-1`;
    expect(cursorLedger(cursor)).toBe(ledger);
  });
});

describe("LEDGER_SECONDS", () => {
  it("is exported from lib/stellar and re-exported by lib/format with the same value", () => {
    expect(typeof LEDGER_SECONDS).toBe("number");
    expect(FORMAT_LEDGER_SECONDS).toBe(LEDGER_SECONDS);
describe("walkEvents", () => {
  type FakeEvent = { id: string };

  const decoder = (raw: unknown): FakeEvent => raw as FakeEvent;

  const makeServer = (pages: Array<{ events: FakeEvent[]; latestLedger: number; cursor: string }>) => {
    const getEvents = vi.fn();
    for (const page of pages) {
      getEvents.mockResolvedValueOnce(page);
    }
    return { getEvents } as unknown as Parameters<typeof walkEvents<FakeEvent>>[0] & {
      getEvents: ReturnType<typeof vi.fn>;
    };
  };

  const filters = { contractIds: ["CABC"] };

  it("returns decoded events from a single page that reaches latestLedger", async () => {
    const server = makeServer([
      { events: [{ id: "1" }, { id: "2" }], latestLedger: 100, cursor: "cursor-100" },
    ]);

    const result = await walkEvents<FakeEvent>(server, filters, decoder, 50);

    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
    expect(server.getEvents).toHaveBeenCalledTimes(1);
    expect(server.getEvents).toHaveBeenCalledWith({
      filters,
      cursor: "50",
      limit: 200,
    });
  });

  it("follows the cursor across pages until cursorLedger >= latestLedger", async () => {
    const server = makeServer([
      { events: [{ id: "1" }], latestLedger: 300, cursor: "cursor-100" },
      { events: [{ id: "2" }], latestLedger: 300, cursor: "cursor-200" },
      { events: [{ id: "3" }], latestLedger: 300, cursor: "cursor-300" },
    ]);

    const result = await walkEvents<FakeEvent>(server, filters, decoder, 50);

    expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
    expect(server.getEvents).toHaveBeenCalledTimes(3);
    expect(server.getEvents.mock.calls[0][0]).toEqual({
      filters,
      cursor: "50",
      limit: 200,
    });
    expect(server.getEvents.mock.calls[1][0]).toEqual({
      filters,
      cursor: "cursor-100",
      limit: 200,
    });
    expect(server.getEvents.mock.calls[2][0]).toEqual({
      filters,
      cursor: "cursor-200",
      limit: 200,
    });
  });

  it("stops after MAX_PAGES even if the cursor never reaches latestLedger", async () => {
    const getEvents = vi.fn();
    for (let i = 0; i < 40; i += 1) {
      getEvents.mockResolvedValueOnce({
        events: [{ id: String(i) }],
        latestLedger: 1_000_000,
        cursor: `cursor-${i}`,
      });
    }
    const server = { getEvents } as unknown as Parameters<typeof walkEvents<FakeEvent>>[0] & {
      getEvents: ReturnType<typeof vi.fn>;
    };

    const result = await walkEvents<FakeEvent>(server, filters, decoder, 0);

    expect(getEvents).toHaveBeenCalledTimes(40);
    expect(result).toHaveLength(40);
    expect(getEvents.mock.calls[0][0]).toEqual({
      filters,
      cursor: "0",
      limit: 200,
    });
    expect(getEvents.mock.calls[1][0]).toEqual({
      filters,
      cursor: "cursor-0",
      limit: 200,
    });
    expect(getEvents.mock.calls[39][0]).toEqual({
      filters,
      cursor: "cursor-38",
      limit: 200,
    });
  });
});
