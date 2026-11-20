import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MySubscriptionsPage from "./page";

const useSubscriptions = vi.fn();

vi.mock("@/hooks/useSubscriptions", () => ({
  useSubscriptions: (address: string) => useSubscriptions(address),
}));

vi.mock("@/components/wallet/RequireWallet", () => ({
  RequireWallet: ({ children }: { children: (address: string) => React.ReactNode }) => <>{children("GABC")}</>,
}));

vi.mock("@/components/subscription/SubscriptionCard", () => ({ SubscriptionCard: () => null }));
vi.mock("@/components/subscription/AllowanceBanner", () => ({ AllowanceBanner: () => null }));
vi.mock("@/components/subscription/CommittedSpend", () => ({ CommittedSpend: () => null }));

vi.mock("@/components/ui/ErrorState", () => ({ ErrorState: () => null }));
vi.mock("@/components/ui/Spinner", () => ({ LoadingBlock: () => <div role="status">Loading</div> }));
vi.mock("@/lib/subscription", () => ({ sortForDisplay: (subs: unknown[]) => subs }));

describe("/subscriptions page", () => {
  beforeEach(() => useSubscriptions.mockReset());

  it("shows the empty state with a link to /plans when the wallet has no subscriptions", () => {
    useSubscriptions.mockReturnValue({ data: [], error: null, reload: vi.fn() });
    render(<MySubscriptionsPage />);

    expect(screen.getByText("No subscriptions yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse plans" })).toHaveAttribute("href", "/plans");
  });

  it("shows a loading state, not the empty state, before data arrives", () => {
    useSubscriptions.mockReturnValue({ data: null, error: null, reload: vi.fn() });
    render(<MySubscriptionsPage />);

    expect(screen.queryByText("No subscriptions yet")).not.toBeInTheDocument();
  });
});
