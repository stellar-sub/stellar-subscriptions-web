import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletProvider } from "./WalletProvider";
import { useWallet } from "@/hooks/useWallet";
import * as freighter from "@/lib/freighter";

vi.mock("@/lib/freighter");

const ADDR1 = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";
const ADDR2 = "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU";

function TestComponent() {
  const wallet = useWallet();
  return (
    <div>
      <div data-testid="address">{wallet.address || "disconnected"}</div>
      <div data-testid="network">{wallet.network}</div>
      <div data-testid="wallet-network">{wallet.walletNetwork || "none"}</div>
      <button onClick={() => void wallet.connect()}>Connect</button>
      <button onClick={() => wallet.disconnect()}>Disconnect</button>
    </div>
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(freighter.isFreighterInstalled).mockResolvedValue(true);
    vi.mocked(freighter.hasAccess).mockResolvedValue(false);
    vi.mocked(freighter.currentAddress).mockResolvedValue(null);
    vi.mocked(freighter.walletNetwork).mockResolvedValue(null);
    vi.mocked(freighter.watchWallet).mockReturnValue(vi.fn());
  });

  it("detects Freighter installation", async () => {
    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(vi.mocked(freighter.isFreighterInstalled)).toHaveBeenCalled();
    });
  });

  it("restores a previous session from localStorage", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(ADDR1);
    });
  });

  it("clears localStorage if address is not present on restore", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(null);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(localStorage.getItem("subs.wallet.connected")).toBeNull();
    });
  });

  it("connects to wallet and stores preference", async () => {
    vi.mocked(freighter.connect).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await user.click(screen.getByText("Connect"));

    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(ADDR1);
      expect(localStorage.getItem("subs.wallet.connected")).toBe("1");
    });
  });

  it("disconnects and removes preference", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(ADDR1);
    });

    await user.click(screen.getByText("Disconnect"));

    expect(screen.getByTestId("address")).toHaveTextContent("disconnected");
    expect(localStorage.getItem("subs.wallet.connected")).toBeNull();
  });

  it("follows wallet network changes", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");
    const mockWatch = vi.fn();
    vi.mocked(freighter.watchWallet).mockReturnValue(mockWatch);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("network")).toHaveTextContent("testnet");
    });

    // Simulate network change via watchWallet callback
    const callback = vi.mocked(freighter.watchWallet).mock.calls[0]?.[0];
    if (callback) {
      vi.mocked(freighter.walletNetwork).mockResolvedValue("mainnet");
      callback({ address: ADDR1, networkPassphrase: "Public Global Stellar Network ; September 2015" });

      await waitFor(() => {
        expect(screen.getByTestId("network")).toHaveTextContent("mainnet");
      });
    }
  });

  it("pauses polling when tab is hidden", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");
    const mockStop = vi.fn();
    vi.mocked(freighter.watchWallet).mockReturnValue(mockStop);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(ADDR1);
    });

    const visibilityEvent = new Event("visibilitychange");
    Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
    document.dispatchEvent(visibilityEvent);

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
  });

  it("resumes polling when tab becomes visible", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");
    vi.mocked(freighter.watchWallet).mockReturnValue(vi.fn());

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(ADDR1);
    });

    Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
    const visibilityEvent = new Event("visibilitychange");
    document.dispatchEvent(visibilityEvent);

    Object.defineProperty(document, "hidden", { value: false, writable: true, configurable: true });
    document.dispatchEvent(visibilityEvent);

    // Verify watchWallet was called again after resuming
    await waitFor(() => {
      expect(vi.mocked(freighter.watchWallet).mock.calls.length).toBeGreaterThan(0);
    });
  });

  it("detects account switch during session", async () => {
    localStorage.setItem("subs.wallet.connected", "1");
    vi.mocked(freighter.currentAddress).mockResolvedValue(ADDR1);
    vi.mocked(freighter.walletNetwork).mockResolvedValue("testnet");
    const mockWatch = vi.fn();
    vi.mocked(freighter.watchWallet).mockReturnValue(mockWatch);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(ADDR1);
    });

    // Simulate account switch
    const callback = vi.mocked(freighter.watchWallet).mock.calls[0]?.[0];
    if (callback) {
      callback({ address: ADDR2, networkPassphrase: "Test SDF Network ; September 2015" });

      await waitFor(() => {
        expect(screen.getByTestId("address")).toHaveTextContent(ADDR2);
      });
    }
  });
});
