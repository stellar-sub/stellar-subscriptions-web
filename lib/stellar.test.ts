import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { explainError, withRetry } from "./stellar";

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
