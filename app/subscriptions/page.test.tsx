import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubStatus, type Subscription } from "@/types";
import MySubscriptionsPage from "./page";

type SubsState = {
  data: Subscription[] | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  balances: [];
  allowances: [];
};

let subsState: SubsState;

// Capture the most-recent router.replace call so tests can assert on it.
let lastReplace: string | undefined;
let lastPush: string | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (url: string) => {
      lastReplace = url;
    },
    push: (url: string) => {
      lastPush = url;
    },
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

// Mutable search string that tests can flip between assertions.
let currentSearch = "";

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    address: "GSUBSCRIBER",
    installed: true,
    connecting: false,
    error: null,
    connect: vi.fn(),
    network: "testnet",
  }),
}));

vi.mock("@/hooks/useSubscriptions", () => ({
  useSubscriptions: () => subsState,
}));

// The page's job here is the title and the empty state; keep its children inert.
vi.mock("@/components/subscription/SubscriptionCard", () => ({
  SubscriptionCard: ({ sub }: { sub: Subscription }) => <div>Subscription #{sub.id}</div>,
}));
vi.mock("@/components/subscription/CommittedSpend", () => ({ CommittedSpend: () => null }));
vi.mock("@/components/subscription/AllowanceBanner", () => ({ AllowanceBanner: () => null }));
vi.mock("@/components/ui/Spinner", () => ({
  Spinner: () => null,
  LoadingBlock: ({ label }: { label: string }) => <div role="status">{label}</div>,
}));

function sub(id: number, status: SubStatus): Subscription {
  return {
    id,
    subscriber: "GSUBSCRIBER",
    merchant: "GMERCHANT",
    token: "CTOKEN",
    amountPerPeriod: 10_000_000n,
    intervalLedgers: 17_280,
    totalCap: 120_000_000n,
    totalCharged: 0n,
    startLedger: 1,
    lastChargeLedger: 0,
    nextChargeLedger: 17_281,
    status,
    planId: 1,
  };
}

const loading = (): SubsState => ({
  data: undefined,
  error: null,
  loading: true,
  reload: vi.fn(),
  balances: [],
  allowances: [],
});
const loaded = (data: Subscription[]): SubsState => ({
  data,
  error: null,
  loading: false,
  reload: vi.fn(),
  balances: [],
  allowances: [],
});

describe("/subscriptions page", () => {
  beforeEach(() => {
    document.title = "Stellar Subscriptions";
    subsState = loading();
    currentSearch = "";
    lastReplace = undefined;
    lastPush = undefined;
  });

  describe("document title", () => {
    it('is "My Subscriptions" while loading', async () => {
      render(<MySubscriptionsPage />);
      await waitFor(() => expect(document.title).toBe("My Subscriptions"));
    });

    it("shows the active count once subscriptions load", async () => {
      const { rerender } = render(<MySubscriptionsPage />);
      await waitFor(() => expect(document.title).toBe("My Subscriptions"));

      subsState = loaded([
        sub(1, SubStatus.Active),
        sub(2, SubStatus.Active),
        sub(3, SubStatus.Paused),
        sub(4, SubStatus.Cancelled),
        sub(5, SubStatus.Exhausted),
      ]);
      rerender(<MySubscriptionsPage />);

      await waitFor(() => expect(document.title).toBe("My Subscriptions (2)"));
    });

    it("resets to the bare title when a reload goes back to loading", async () => {
      subsState = loaded([sub(1, SubStatus.Active)]);
      const { rerender } = render(<MySubscriptionsPage />);
      await waitFor(() => expect(document.title).toBe("My Subscriptions (1)"));

      subsState = loading();
      rerender(<MySubscriptionsPage />);

      await waitFor(() => expect(document.title).toBe("My Subscriptions"));
    });

    it('shows "(0)" when the wallet has no subscriptions', async () => {
      subsState = loaded([]);
      render(<MySubscriptionsPage />);
      await waitFor(() => expect(document.title).toBe("My Subscriptions (0)"));
    });
  });

  describe("empty state", () => {
    it("prompts first-time subscribers to browse plans", () => {
      subsState = loaded([]);
      render(<MySubscriptionsPage />);

      expect(screen.getByRole("heading", { name: "No subscriptions yet" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Browse plans" })).toHaveAttribute("href", "/plans");
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("is not shown while loading", () => {
      render(<MySubscriptionsPage />);
      expect(screen.queryByText("No subscriptions yet")).not.toBeInTheDocument();
    });

    it("is not shown when the wallet has subscriptions", () => {
      subsState = loaded([sub(7, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      expect(screen.queryByText("No subscriptions yet")).not.toBeInTheDocument();
      expect(screen.getByText("Subscription #7")).toBeInTheDocument();
    });
  });

  describe("URL-driven filter and sort state", () => {
    it("defaults to status=all and sort=default when params are absent", () => {
      subsState = loaded([sub(1, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      expect(screen.getByLabelText("Status:")).toHaveValue("all");
      expect(screen.getByLabelText("Sort by:")).toHaveValue("default");
    });

    it("reads status from the URL on mount", () => {
      currentSearch = "status=paused";
      subsState = loaded([sub(1, SubStatus.Active), sub(2, SubStatus.Paused)]);
      render(<MySubscriptionsPage />);

      expect(screen.getByLabelText("Status:")).toHaveValue("paused");
      // Only the paused subscription should be listed.
      expect(screen.queryByText("Subscription #1")).not.toBeInTheDocument();
      expect(screen.getByText("Subscription #2")).toBeInTheDocument();
    });

    it("reads sort from the URL on mount", () => {
      currentSearch = "sort=next-charge";
      subsState = loaded([sub(1, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      expect(screen.getByLabelText("Sort by:")).toHaveValue("next-charge");
    });

    it("calls router.replace (not push) when the status filter changes", async () => {
      subsState = loaded([sub(1, SubStatus.Active), sub(2, SubStatus.Paused)]);
      render(<MySubscriptionsPage />);

      await userEvent.selectOptions(screen.getByLabelText("Status:"), "paused");

      expect(lastReplace).toContain("status=paused");
      expect(lastPush).toBeUndefined();
    });

    it("calls router.replace (not push) when the sort key changes", async () => {
      subsState = loaded([sub(1, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      await userEvent.selectOptions(screen.getByLabelText("Sort by:"), "amount");

      expect(lastReplace).toContain("sort=amount");
      expect(lastPush).toBeUndefined();
    });

    it("omits default values from the URL to keep it clean", async () => {
      currentSearch = "status=paused&sort=amount";
      subsState = loaded([sub(1, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      // Reset status to "all" — should drop it from the URL.
      await userEvent.selectOptions(screen.getByLabelText("Status:"), "all");
      expect(lastReplace).not.toContain("status=");

      // Reset sort to "default" — should drop it from the URL.
      lastReplace = undefined;
      await userEvent.selectOptions(screen.getByLabelText("Sort by:"), "default");
      expect(lastReplace).not.toContain("sort=");
    });

    it("round-trips status and sort through the URL", () => {
      // Simulate the page being loaded with both params already in the URL.
      currentSearch = "status=cancelled&sort=amount";
      subsState = loaded([
        sub(1, SubStatus.Active),
        sub(2, SubStatus.Cancelled),
        sub(3, SubStatus.Cancelled),
      ]);
      render(<MySubscriptionsPage />);

      // Controls reflect URL.
      expect(screen.getByLabelText("Status:")).toHaveValue("cancelled");
      expect(screen.getByLabelText("Sort by:")).toHaveValue("amount");

      // Only cancelled subscriptions are shown.
      expect(screen.queryByText("Subscription #1")).not.toBeInTheDocument();
      expect(screen.getByText("Subscription #2")).toBeInTheDocument();
      expect(screen.getByText("Subscription #3")).toBeInTheDocument();
    });

    it("ignores unrecognised param values and falls back to defaults", () => {
      currentSearch = "status=bogus&sort=nonsense";
      subsState = loaded([sub(1, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      expect(screen.getByLabelText("Status:")).toHaveValue("all");
      expect(screen.getByLabelText("Sort by:")).toHaveValue("default");
    });

    it("shows an empty filtered state when no subscriptions match the status", () => {
      currentSearch = "status=paused";
      subsState = loaded([sub(1, SubStatus.Active), sub(2, SubStatus.Active)]);
      render(<MySubscriptionsPage />);

      expect(screen.getByRole("heading", { name: "No paused subscriptions" })).toBeInTheDocument();
    });
  });
});
