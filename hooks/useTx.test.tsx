import { act, renderHook } from "@testing-library/react";
import { useTx } from "./useTx";
import { WalletContext, type WalletState } from "./useWallet";
import type { ReactNode } from "react";
import type { WriteCtx } from "@/lib/stellar";

// A wallet stub whose writeCtx throws the no-account error, matching the
// behaviour in WalletProvider when address is null.
function makeWalletStub(overrides?: Partial<WalletState>): WalletState {
  return {
    address: null,
    network: "testnet",
    walletNetwork: null,
    installed: false,
    connecting: false,
    error: null,
    accountSwitched: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    setNetwork: vi.fn(),
    clearAccountSwitchWarning: vi.fn(),
    writeCtx: () => {
      throw new Error("Connect your wallet to continue.");
    },
    ...overrides,
  };
}

function wrapper(wallet: WalletState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
  };
}

describe("useTx", () => {
  describe("when no wallet is connected", () => {
    it("surfaces the connect-prompt as error state, not an unhandled throw", async () => {
      const { result } = renderHook(() => useTx(), {
        wrapper: wrapper(makeWalletStub()),
      });

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.run((_ctx: WriteCtx) => Promise.resolve({ hash: "x" }));
      });

      expect(returnValue).toBeNull();
      expect(result.current.error).toBe("Connect your wallet to continue.");
      expect(result.current.phase).toBe("error");
    });

    it("does not set phase to success when writeCtx throws", async () => {
      const { result } = renderHook(() => useTx(), {
        wrapper: wrapper(makeWalletStub()),
      });

      await act(async () => {
        await result.current.run((_ctx: WriteCtx) => Promise.resolve({ hash: "x" }));
      });

      expect(result.current.phase).not.toBe("success");
    });
  });

  describe("when a wallet is connected", () => {
    it("returns the result and sets phase to success", async () => {
      const fakeCtx: WriteCtx = {
        network: "testnet",
        source: "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4",
        sign: vi.fn(),
        onPhase: undefined,
      };

      const { result } = renderHook(() => useTx(), {
        wrapper: wrapper(
          makeWalletStub({
            address: fakeCtx.source,
            walletNetwork: "testnet",
            writeCtx: () => fakeCtx,
          }),
        ),
      });

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.run((_ctx: WriteCtx) =>
          Promise.resolve({ hash: "abc123" }),
        );
      });

      expect(returnValue).toEqual({ hash: "abc123" });
      expect(result.current.error).toBeNull();
      expect(result.current.phase).toBe("success");
    });
  });
});
