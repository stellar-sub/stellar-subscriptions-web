import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { axe } from "vitest-axe";
import { MerchantPlansTable } from "./MerchantPlansTable";
import type { Plan } from "@/types";
import { SubStatus } from "@/types";

// ── mocks ─────────────────────────────────────────────────────────────────────

// TokenAmount needs useToken which calls the network; stub it out.
vi.mock("@/components/ui/TokenAmount", () => ({
  TokenAmount: ({ value, token }: { value: bigint; token: string }) => (
    <span data-testid="token-amount">
      {value.toString()} {token}
    </span>
  ),
}));

// PlanBadge has no external deps so we can use the real one, but stub for speed.
vi.mock("@/components/plan/PlanBadge", () => ({
  PlanBadge: ({ active }: { active: boolean }) => (
    <span data-testid="plan-badge">{active ? "Active" : "Closed"}</span>
  ),
}));

// ── fixtures ──────────────────────────────────────────────────────────────────

const BASE_PLAN: Plan = {
  id: 1,
  merchant: "GMERCHANT1111111111111111111111111111111111111111111111",
  name: "Pro Plan",
  token: "CTOKEN1111111111111111111111111111111111111111111111111111",
  amountPerPeriod: 10_000_000n,
  intervalLedgers: 100,
  defaultCap: 120_000_000n,
  active: true,
  createdAt: 1000,
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("MerchantPlansTable", () => {
  // ── empty state ─────────────────────────────────────────────────────────

  it("renders an empty-state message when plans array is empty", () => {
    render(<MerchantPlansTable plans={[]} />);
    expect(
      screen.getByText(/you have not published any plans yet/i),
    ).toBeInTheDocument();
  });

  it("renders an empty-state message when plans is undefined-like (empty array)", () => {
    render(<MerchantPlansTable plans={[]} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // ── plan name and limitation notice ─────────────────────────────────────

  it("renders the plan name", () => {
    render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    expect(screen.getAllByText("Pro Plan").length).toBeGreaterThan(0);
  });

  it("renders a limitation notice that name cannot be changed after creation", () => {
    render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    // Both the card and table views render the notice; at least one must appear
    const notices = screen.getAllByText(/name cannot be changed after creation/i);
    expect(notices.length).toBeGreaterThan(0);
  });

  it("limitation notice carries a title explaining the on-chain reason", () => {
    render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    const notices = screen.getAllByTitle(/plan contract does not expose an update function/i);
    expect(notices.length).toBeGreaterThan(0);
  });

  it("does not render any editable input or rename button for the name", () => {
    render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    // No text input for editing the name
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /rename/i }),
    ).not.toBeInTheDocument();
  });

  // ── plan details ─────────────────────────────────────────────────────────

  it("renders the plan status badge", () => {
    render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    expect(screen.getAllByTestId("plan-badge").length).toBeGreaterThan(0);
  });

  it("renders a link to the plan public page", () => {
    render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    const links = screen.getAllByRole("link", { name: /view public page/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", `/plans/${BASE_PLAN.id}`);
  });

  it("renders all plans when multiple are provided", () => {
    const plans: Plan[] = [
      BASE_PLAN,
      { ...BASE_PLAN, id: 2, name: "Starter Plan" },
      { ...BASE_PLAN, id: 3, name: "Enterprise Plan", active: false },
    ];
    render(<MerchantPlansTable plans={plans} />);

    expect(screen.getAllByText("Pro Plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Starter Plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enterprise Plan").length).toBeGreaterThan(0);
  });

  // ── accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations on the empty state", async () => {
    const { container } = render(<MerchantPlansTable plans={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations with plans rendered", async () => {
    const { container } = render(<MerchantPlansTable plans={[BASE_PLAN]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
