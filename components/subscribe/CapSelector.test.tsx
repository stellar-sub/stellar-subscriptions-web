import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CapSelector } from "./CapSelector";

const AMOUNT_PER_PERIOD = 10_000_000n; // 1 XLM at 7 decimals
const DEFAULT_CAP = 120_000_000n; // 12 XLM

function renderSelector(onChange = vi.fn()) {
  render(
    <CapSelector
      amountPerPeriod={AMOUNT_PER_PERIOD}
      defaultCap={DEFAULT_CAP}
      decimals={7}
      symbol="XLM"
      onChange={onChange}
    />,
  );
  return onChange;
}

const customCapInput = () => screen.getByRole("textbox", { name: /Custom cap/ });

async function chooseCustomCap(value: string) {
  await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
  await userEvent.type(customCapInput(), value);
}

describe("CapSelector", () => {
  it("reports the default cap and describes it in charges", () => {
    const onChange = renderSelector();
    expect(screen.getByRole("radio", { name: /Use the default cap/ })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_CAP);
    expect(screen.getByText(/12 charges/)).toBeInTheDocument();
  });

  it("accepts a valid custom cap and reports the parsed value", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("5");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(50_000_000n);
    expect(screen.getByText(/5 charges/)).toBeInTheDocument();
  });

  it("reports null and asks for a value when the entry is empty", async () => {
    const onChange = renderSelector();
    await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a cap/i);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("rejects too many decimals and reports null", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("1.12345678");
    expect(screen.getByRole("alert")).toHaveTextContent(/too many decimals/i);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("rejects a cap below one charge and reports null", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("0.5");
    expect(screen.getByRole("alert")).toHaveTextContent(/must cover at least one charge/i);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("explains the remainder that can never be charged", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("5.5");
    expect(onChange).toHaveBeenLastCalledWith(55_000_000n);
    expect(screen.getByText(/can never be charged/i)).toBeInTheDocument();
  });
});
