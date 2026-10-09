import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletContext, type WalletState } from "@/hooks/useWallet";
import { cancelSubscription, pauseSubscription, resumeSubscription } from "@/lib/contracts";
import { SubStatus, type Subscription } from "@/types";
import { SubscriptionCard } from "./SubscriptionCard";

vi.mock("@/lib/contracts", () => ({
  getTokenInfo: vi.fn().mockResolvedValue({ contractId: "CXLM", symbol: "XLM", name: "native", decimals: 7 }),
  cancelSubscription: vi.fn().mockResolvedValue({ hash: "cancelhash" }),
  pauseSubscription: vi.fn().mockResolvedValue({ hash: "pausehash" }),
  resumeSubscription: vi.fn().mockResolvedValue({ hash: "resumehash" }),
}));
vi.mock("@/lib/stellar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stellar")>()),
  getLatestLedger: vi.fn().mockResolvedValue(1_000),
}));

const SUBSCRIBER = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";

const base: Subscription = {
  id: 7,
  subscriber: SUBSCRIBER,
  merchant: "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU",
  token: "CXLM",
  amountPerPeriod: 10_000_000n,
  intervalLedgers: 720,
  totalCap: 120_000_000n,
  totalCharged: 30_000_000n,
  startLedger: 100,
  lastChargeLedger: 900,
  nextChargeLedger: 1_620,
  status: SubStatus.Active,
  planId: 1,
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

function renderCard(sub: Subscription, onChanged = vi.fn()) {
  render(
    <WalletContext.Provider value={wallet}>
      <SubscriptionCard sub={sub} onChanged={onChanged} />
    </WalletContext.Provider>,
  );
  return onChanged;
}

describe("SubscriptionCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the cap progress and a visible Pause and Cancel on a live subscription", async () => {
    renderCard(base);
    expect(screen.getByRole("progressbar", { name: "25% of the cap charged" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel subscription" })).toBeVisible();
    expect(await screen.findByText(/Not before about/)).toBeInTheDocument();
  });

  it("states plainly that no further charges can occur before cancelling", async () => {
    renderCard(base);
    await userEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("After you cancel, no further charges can occur.");
    expect(dialog).toHaveTextContent("final and can't be undone");
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it("cancels only after the second, explicit confirmation", async () => {
    const onChanged = renderCard(base);
    await userEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel for good" }));
    await waitFor(() => expect(cancelSubscription).toHaveBeenCalledWith(expect.anything(), 7));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(await screen.findByText(/Cancelled\. No further charges can occur\./)).toBeInTheDocument();
  });

  it("can back out of cancelling without sending anything", async () => {
    renderCard(base);
    await userEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep subscription" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and explains the failure when cancelling fails", async () => {
    vi.mocked(cancelSubscription).mockRejectedValueOnce(new Error("You declined the request in Freighter."));
    renderCard(base);
    await userEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, cancel for good" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You declined the request in Freighter.");
    expect(screen.getByRole("button", { name: "Yes, cancel for good" })).toBeEnabled();
  });

  it("pauses an active subscription and resumes a paused one", async () => {
    renderCard(base);
    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(pauseSubscription).toHaveBeenCalledWith(expect.anything(), 7));
  });

  it("offers Resume, and still Cancel, on a paused subscription", async () => {
    renderCard({ ...base, status: SubStatus.Paused });
    expect(screen.getByText("None while paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel subscription" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(resumeSubscription).toHaveBeenCalledWith(expect.anything(), 7));
  });

  it("offers no controls once cancelled, and says nothing more can be charged", () => {
    renderCard({ ...base, status: SubStatus.Cancelled });
    expect(screen.queryByRole("button", { name: /Pause|Resume|Cancel subscription/ })).not.toBeInTheDocument();
    expect(screen.getByText("Cancelled. Nothing more can be charged.")).toBeInTheDocument();
    expect(screen.getByText("None — cancelled")).toBeInTheDocument();
  });

  it("offers no controls once the cap is fully charged", () => {
    renderCard({ ...base, status: SubStatus.Exhausted, totalCharged: 120_000_000n });
    expect(screen.queryByRole("button", { name: /Pause|Resume|Cancel subscription/ })).not.toBeInTheDocument();
    expect(screen.getByText("The whole cap has been charged. Nothing more can be taken.")).toBeInTheDocument();
  });
});
