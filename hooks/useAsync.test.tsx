import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAsync } from "./useAsync";

describe("useAsync", () => {
  it("ignores a stale response that resolves after a newer one", async () => {
    const resolvers: Array<(value: string) => void> = [];
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useAsync(loader, [id]),
      { initialProps: { id: "first" } },
    );

    expect(loader).toHaveBeenCalledTimes(1);

    rerender({ id: "second" });
    expect(loader).toHaveBeenCalledTimes(2);

    // Newer run resolves first.
    await act(async () => {
      resolvers[1]("second-result");
    });

    await waitFor(() => {
      expect(result.current.data).toBe("second-result");
    });

    // Older run resolves late and must be discarded.
    await act(async () => {
      resolvers[0]("first-result");
    });

    expect(result.current.data).toBe("second-result");
  });

  it("does not update state after unmount", async () => {
    let resolveLoader: (value: string) => void = () => {};
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { unmount } = renderHook(() => useAsync(loader, []));

    expect(loader).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      resolveLoader("late-result");
      await Promise.resolve();
    });

    const unmountedWarning = consoleError.mock.calls.some((args) =>
      args.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("unmounted component"),
      ),
    );
    expect(unmountedWarning).toBe(false);

    consoleError.mockRestore();
  });

  it("re-runs the loader when reload is called", async () => {
    const loader = vi
      .fn<[], Promise<string>>()
      .mockResolvedValueOnce("first-result")
      .mockResolvedValueOnce("second-result");

    const { result } = renderHook(() => useAsync(loader, []));

    await waitFor(() => {
      expect(result.current.data).toBe("first-result");
    });
    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.reload();
    });

    expect(loader).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.data).toBe("second-result");
    });
  });

  it("re-runs the loader when refetch is called", async () => {
    const loader = vi
      .fn<[], Promise<string>>()
      .mockResolvedValueOnce("first-result")
      .mockResolvedValueOnce("second-result");

    const { result } = renderHook(() => useAsync(loader, []));

    await waitFor(() => {
      expect(result.current.data).toBe("first-result");
    });
    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
    });

    expect(loader).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.data).toBe("second-result");
    });
  });
});

const readSubscriptions = vi.fn();

vi.mock("./useContracts", () => ({
  readSubscriptions: (...args: unknown[]) => readSubscriptions(...args),
}));

describe("useSubscriptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    readSubscriptions.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves a fresh cache entry without a new RPC call on remount", async () => {
    const { useSubscriptions } = await import("./useSubscriptions");
    const { invalidateSubscriptions } = await import("./useSubscriptions");
    invalidateSubscriptions();

    readSubscriptions.mockResolvedValueOnce(["sub-1"]);

    const first = renderHook(() => useSubscriptions());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => {
      expect(first.result.current.data).toEqual(["sub-1"]);
    });
    expect(readSubscriptions).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useSubscriptions());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(second.result.current.data).toEqual(["sub-1"]);
    expect(readSubscriptions).toHaveBeenCalledTimes(1);
    second.unmount();
  });

  it("renders stale data immediately and revalidates in the background", async () => {
    const { useSubscriptions, invalidateSubscriptions } = await import(
      "./useSubscriptions"
    );
    invalidateSubscriptions();

    readSubscriptions
      .mockResolvedValueOnce(["sub-1"])
      .mockResolvedValueOnce(["sub-1", "sub-2"]);

    const first = renderHook(() => useSubscriptions());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => {
      expect(first.result.current.data).toEqual(["sub-1"]);
    });
    first.unmount();

    // Advance past the cache TTL so the entry becomes stale.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    const second = renderHook(() => useSubscriptions());
    // Stale data is available synchronously on first render.
    expect(second.result.current.data).toEqual(["sub-1"]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(readSubscriptions).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(second.result.current.data).toEqual(["sub-1", "sub-2"]);
    });
    second.unmount();
  });

  it("clears the cache on invalidateSubscriptions so the next mount fetches fresh", async () => {
    const { useSubscriptions, invalidateSubscriptions } = await import(
      "./useSubscriptions"
    );
    invalidateSubscriptions();

    readSubscriptions
      .mockResolvedValueOnce(["sub-1"])
      .mockResolvedValueOnce(["sub-2"]);

    const first = renderHook(() => useSubscriptions());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await waitFor(() => {
      expect(first.result.current.data).toEqual(["sub-1"]);
    });
    first.unmount();

    invalidateSubscriptions();

    const second = renderHook(() => useSubscriptions());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(readSubscriptions).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(second.result.current.data).toEqual(["sub-2"]);
    });
    second.unmount();
  });
});
