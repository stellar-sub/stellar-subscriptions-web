import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLedger } from "./useLedger";

describe("useLedger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("performs the first read on mount", async () => {
    const read = vi.fn().mockResolvedValue(100);

    const { result } = renderHook(() => useLedger({ read, intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(read).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe(100);
  });

  it("reads again on each interval tick", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(300);

    const { result } = renderHook(() => useLedger({ read, intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(result.current.value).toBe(200);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(read).toHaveBeenCalledTimes(3);
    expect(result.current.value).toBe(300);
  });

  it("keeps the last value when a read fails", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(100)
      .mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useLedger({ read, intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.value).toBe(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(read).toHaveBeenCalledTimes(2);
    expect(result.current.value).toBe(100);
  });

  it("clears the interval on unmount", async () => {
    const read = vi.fn().mockResolvedValue(100);

    const { unmount } = renderHook(() => useLedger({ read, intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(read).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(read).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
