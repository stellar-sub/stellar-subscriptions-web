import { render, screen } from "@testing-library/react";
import { TxProgress } from "./TxProgress";

describe("TxProgress", () => {
  it("shows the in-progress phase with the current step", () => {
    render(<TxProgress phase="signing" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/sign/i)).toBeInTheDocument();
  });

  it("shows the success phase with an explorer link", () => {
    render(<TxProgress phase="success" hash="abc123" network="testnet" />);
    const link = screen.getByRole("link", { name: /explorer|view/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("abc123"));
  });

  it("shows the error phase with the error text", () => {
    render(<TxProgress phase="error" error="You declined the request in Freighter." />);
    expect(screen.getByRole("alert")).toHaveTextContent("You declined the request in Freighter.");
  });

  it("shows the extra check step only when requested", () => {
    const { rerender } = render(<TxProgress phase="signing" />);
    expect(screen.queryByText(/check/i)).not.toBeInTheDocument();
    rerender(<TxProgress phase="signing" showCheckStep />);
    expect(screen.getByText(/check/i)).toBeInTheDocument();
  });

  it.each([
    ["testnet", "testnet"],
    ["mainnet", "public"],
    ["futurenet", "futurenet"],
  ] as const)("links to the %s explorer on success", (network, explorerSegment) => {
    render(<TxProgress phase="success" hash="deadbeef" network={network} />);
    const link = screen.getByRole("link", { name: /explorer|view/i });
    expect(link).toHaveAttribute("href", expect.stringContaining(explorerSegment));
    expect(link).toHaveAttribute("href", expect.stringContaining("deadbeef"));
  });
});
