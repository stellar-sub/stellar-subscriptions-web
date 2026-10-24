import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
