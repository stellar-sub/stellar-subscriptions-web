import { render, screen } from "@testing-library/react";
import { AuthorizationSummary } from "./AuthorizationSummary";

const XLM = { contractId: "CXLM", symbol: "XLM", name: "native", decimals: 7 };
const MERCHANT = "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU";

function summary(cap: bigint) {
  return render(
    <AuthorizationSummary
      merchant={MERCHANT}
      amountPerPeriod={10_000_000n}
      intervalLedgers={17_280}
      cap={cap}
      token={XLM}
    />,
  );
}

describe("AuthorizationSummary", () => {
  it("states amount, interval, cap and the maximum number of charges", () => {
    const { container } = summary(120_000_000n);
    expect(container).toHaveTextContent("1 XLM per charge, at most once every day");
    expect(container).toHaveTextContent("17,280 ledgers between charges");
    expect(container).toHaveTextContent("Never more than 12 XLM in total");
    expect(container).toHaveTextContent("at most 12 charges");
  });

  it("says plainly that cancelling stops all further charges", () => {
    summary(120_000_000n);
    expect(screen.getByText("After you cancel, no further charges can occur.")).toBeInTheDocument();
  });

  it("explains the part of a cap that can never be charged", () => {
    const { container } = summary(25_000_000n);
    expect(container).toHaveTextContent("at most 2 charges");
    expect(container).toHaveTextContent("The last 0.5 XLM of the cap can never be charged");
  });

  it("names the contract, not the website, as the enforcer", () => {
    const { container } = summary(120_000_000n);
    expect(container).toHaveTextContent("enforced by the subscription contract, not by this website");
  });
});
