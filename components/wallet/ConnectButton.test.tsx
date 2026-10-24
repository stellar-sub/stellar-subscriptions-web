import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectButton } from "./ConnectButton";
import { NetworkSelector } from "./NetworkSelector";
import { WalletContext, type WalletContextValue } from "./WalletContext";

function renderWithWallet(
  value: Partial<WalletContextValue>,
  ui: React.ReactNode = <ConnectButton />,
) {
  const contextValue = {
    status: "no-extension",
    address: null,
    chainId: null,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchNetwork: vi.fn(),
    ...value,
  } as WalletContextValue;

  return {
    ...render(
      <WalletContext.Provider value={contextValue}>{ui}</WalletContext.Provider>,
    ),
    contextValue,
  };
}

describe("ConnectButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a prompt when no wallet extension is available", () => {
    renderWithWallet({ status: "no-extension" });
    expect(screen.getByText(/install a wallet/i)).toBeInTheDocument();
  });

  it("renders a connect action when ready", () => {
    const { contextValue } = renderWithWallet({ status: "ready" });
    const button = screen.getByRole("button", { name: /connect/i });
    fireEvent.click(button);
    expect(contextValue.connect).toHaveBeenCalledTimes(1);
  });

  it("disables the button while connecting", () => {
    renderWithWallet({ status: "connecting" });
    expect(screen.getByRole("button", { name: /connecting/i })).toBeDisabled();
  });

  it("shows the connected address and allows disconnect", () => {
    const { contextValue } = renderWithWallet({
      status: "connected",
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });
    expect(screen.getByText(/0x1234/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
    expect(contextValue.disconnect).toHaveBeenCalledTimes(1);
  });

  it("shows the connect error accessibly", () => {
    renderWithWallet({ status: "error", error: "User rejected the request" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/user rejected the request/i);
  });
});

describe("NetworkSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the current network", () => {
    renderWithWallet({ status: "ready", chainId: 8453 }, <NetworkSelector />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("is disabled while connected", () => {
    renderWithWallet(
      {
        status: "connected",
        chainId: 8453,
        address: "0x1234567890abcdef1234567890abcdef12345678",
      },
      <NetworkSelector />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
