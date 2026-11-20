import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { DeactivatePlanButton } from "./DeactivatePlanButton";

vi.mock("@/hooks/useTx", () => ({
  useTx: () => ({ run: vi.fn(), phase: "idle", hash: null, error: null, pending: false, reset: vi.fn() }),
}));
vi.mock("@/components/ui/TxProgress", () => ({ TxProgress: () => null }));
vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ network: "testnet" }) }));

describe("DeactivatePlanButton accessibility", () => {
  it("labels the trigger button with the plan name", () => {
    render(<DeactivatePlanButton planId={1} planName="Pro Monthly" />);
    expect(screen.getByRole("button", { name: "Deactivate plan Pro Monthly" })).toBeInTheDocument();
  });

  it("gives each button in a list a distinct accessible name", () => {
    render(
      <>
        <DeactivatePlanButton planId={1} planName="Basic" />
        <DeactivatePlanButton planId={2} planName="Pro" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Deactivate plan Basic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate plan Pro" })).toBeInTheDocument();
  });

  it("exposes the label as the button's aria-label attribute", () => {
    render(<DeactivatePlanButton planId={1} planName="Pro" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Deactivate plan Pro");
  });
});
