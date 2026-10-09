import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletContext, type WalletState } from "@/hooks/useWallet";
import { subscribe } from "@/lib/contracts";
import type { Plan } from "@/types";
import { SubscribeForm } from "./SubscribeForm";

vi.mock("@/lib/contracts", () => ({
  getTokenBalance: vi.fn().mockResolvedValue(1_000_000_000n),
  getTokenInfo: vi.fn(),
  subscribe: vi.fn().mockResolvedValue({ hash: "abc123", id: 7 }),
}));

const SUBSCRIBER = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";
const XLM = { contractId: "CXLM", symbol: "XLM", name: "native", decimals: 7 };

const plan: Plan = {
  id: 1,
  merchant: "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU",
  name: "Demo hourly",
  token: "CXLM",
  amountPerPeriod: 10_000_000n,
  intervalLedgers: 720,
  defaultCap: 120_000_000n,
  active: true,
  createdAt: 1,
};

const wallet: WalletState = {
  address: SUBSCRIBER,
  network: "testnet",
  walletNetwork: "testnet",
  installed: true,
  connecting: false,
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  setNetwork: vi.fn(),
  writeCtx: (onPhase) => ({ network: "testnet", source: SUBSCRIBER, sign: vi.fn(), onPhase }),
};

function renderForm(p: Plan = plan) {
  return render(
    <WalletContext.Provider value={wallet}>
      <SubscribeForm plan={p} token={XLM} />
    </WalletContext.Provider>,
  );
}

const confirmButton = () => screen.getByRole("button", { name: "Authorize and subscribe" });

describe("SubscribeForm", () => {
  beforeEach(() => vi.mocked(subscribe).mockClear());

  it("shows the authorization summary before any subscribe action is possible", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "What you're authorizing" })).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it("enables subscribing only after the summary is acknowledged", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("checkbox", { name: /read what I'm authorizing/ }));
    expect(confirmButton()).toBeEnabled();
  });

  it("subscribes with exactly the chosen cap and the plan's terms", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("checkbox", { name: /read what I'm authorizing/ }));
    await userEvent.click(confirmButton());
    await waitFor(() =>
      expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ source: SUBSCRIBER }), {
        merchant: plan.merchant,
        token: plan.token,
        amountPerPeriod: 10_000_000n,
        intervalLedgers: 720,
        totalCap: 120_000_000n,
        planId: 1,
      }),
    );
    expect(await screen.findByText(/subscription #7 is active/)).toBeInTheDocument();
  });

  it("blocks a custom cap below one charge and hides the summary", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
    await userEvent.type(screen.getByRole("textbox", { name: /Custom cap/ }), "0.5");
    expect(screen.getByRole("alert")).toHaveTextContent("must cover at least one charge");
    expect(screen.queryByRole("heading", { name: "What you're authorizing" })).not.toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it("asks for acknowledgement again when the cap changes", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("checkbox", { name: /read what I'm authorizing/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
    await userEvent.type(screen.getByRole("textbox", { name: /Custom cap/ }), "3");
    expect(screen.getByRole("checkbox", { name: /read what I'm authorizing/ })).not.toBeChecked();
    expect(confirmButton()).toBeDisabled();
  });

  it("offers no subscribe action on a closed plan", () => {
    renderForm({ ...plan, active: false });
    expect(screen.queryByRole("button", { name: "Authorize and subscribe" })).not.toBeInTheDocument();
    expect(screen.getByText(/closed to new subscribers/)).toBeInTheDocument();
  });
});
