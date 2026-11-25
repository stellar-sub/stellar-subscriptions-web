import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invalidatePlans } from "@/hooks/usePlans";
import { createPlan } from "@/lib/contracts";
import { CreatePlanForm } from "./CreatePlanForm";

// Stub TokenSelect so the token is always ready (XLM, 7 decimals) with no network calls.
vi.mock("@/components/plan/TokenSelect", () => ({
  TokenSelect: ({ onChange }: { onChange: (v: unknown) => void }) => {
    // Call onChange once on mount to signal a valid token selection.
    // Using useEffect here would cause act() warnings, so we render a hidden
    // button the test can click to trigger it only once.
    return (
      <button
        type="button"
        data-testid="token-ready"
        onClick={() =>
          onChange({
            tokenId: "CXLMNATIVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            info: { symbol: "XLM", decimals: 7 },
            error: null,
          })
        }
      >
        Set token
      </button>
    );
  },
}));

vi.mock("@/lib/contracts", () => ({
  createPlan: vi.fn(),
  nativeTokenId: "CXLMNATIVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
}));

vi.mock("@/hooks/usePlans", () => ({
  invalidatePlans: vi.fn(),
}));

// Provide a minimal useTx whose `run` delegates to the action with a fake ctx.
vi.mock("@/hooks/useTx", () => ({
  useTx: () => ({
    run: vi.fn((action: (ctx: unknown) => Promise<unknown>) => action({ network: "testnet", source: "GMERCHANT" })),
    phase: "idle",
    error: null,
    reset: vi.fn(),
  }),
}));

// TxProgress can be a no-op for this test.
vi.mock("@/components/ui/TxProgress", () => ({
  TxProgress: () => null,
}));

const MERCHANT = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";

async function fillAndSubmit() {
  // Activate the token selection (makes the form unblock the token-blocked guard).
  await userEvent.click(screen.getByTestId("token-ready"));

  await userEvent.type(screen.getByLabelText(/merchant address/i), MERCHANT);
  await userEvent.clear(screen.getByLabelText(/amount per charge/i));
  await userEvent.type(screen.getByLabelText(/amount per charge/i), "1");
  // charges and period have defaults (12 and 30) so we can submit immediately.
  await userEvent.click(screen.getByRole("button", { name: /create plan/i }));
}

describe("CreatePlanForm", () => {
  beforeEach(() => {
    vi.mocked(createPlan).mockResolvedValue({ hash: "0xabc", id: 42 });
    vi.mocked(invalidatePlans).mockClear();
  });

  it("calls invalidatePlans immediately after createPlan succeeds", async () => {
    render(<CreatePlanForm />);
    await fillAndSubmit();

    await waitFor(() => expect(invalidatePlans).toHaveBeenCalledTimes(1));
  });

  it("calls onCreated with the new plan id after createPlan succeeds", async () => {
    const onCreated = vi.fn();
    render(<CreatePlanForm onCreated={onCreated} />);
    await fillAndSubmit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("42"));
  });

  it("does not call invalidatePlans when createPlan fails", async () => {
    vi.mocked(createPlan).mockRejectedValue(new Error("Contract error"));
    render(<CreatePlanForm />);
    await fillAndSubmit();

    await waitFor(() => expect(createPlan).toHaveBeenCalled());
    expect(invalidatePlans).not.toHaveBeenCalled();
  });
});
