import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CapSelector } from "./CapSelector";

const AMOUNT_PER_PERIOD = 10_000_000n; // 1 XLM at 7 decimals
const DEFAULT_CAP = 120_000_000n; // 12 XLM

const TOKEN = {
  symbol: "XLM",
  decimals: 7,
};

function renderSelector(onChange = vi.fn()) {
  render(
    <CapSelector
      amountPerPeriod={AMOUNT_PER_PERIOD}
      defaultCap={DEFAULT_CAP}
      token={TOKEN}
      onChange={onChange}
    />,
  );
  return onChange;
}

const slider = () => screen.getByRole("slider");

const customCapInput = () => screen.getByRole("textbox", { name: /Custom cap/ });

async function chooseCustomCap(value: string) {
  await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
  await userEvent.type(customCapInput(), value);
}

describe("CapSelector", () => {
  it("reports the default cap and describes it in charges", () => {
    const onChange = renderSelector();
    expect(screen.getByRole("radio", { name: /Use the default cap/ })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith({ cap: DEFAULT_CAP });
    expect(screen.getByText(/12 charges/)).toBeInTheDocument();
  });

  it("exposes an accessible aria-valuetext on the slider", () => {
    renderSelector();
    const valueText = slider().getAttribute("aria-valuetext");
    expect(valueText).toBeTruthy();
    expect(valueText).toContain("12");
    expect(valueText).toContain("XLM");
    expect(valueText).toMatch(/12 charges/);
  });

  it("updates aria-valuetext when the slider changes", async () => {
    renderSelector();
    const before = slider().getAttribute("aria-valuetext");
    await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
    await userEvent.type(customCapInput(), "5");
    const after = slider().getAttribute("aria-valuetext");
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
    expect(after).toContain("5");
    expect(after).toMatch(/5 charges/);
  });

  it("accepts a valid custom cap and reports the parsed value", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("5");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ cap: 50_000_000n });
    expect(screen.getByText(/5 charges/)).toBeInTheDocument();
  });

  it("reports null and asks for a value when the entry is empty", async () => {
    const onChange = renderSelector();
    await userEvent.click(screen.getByRole("radio", { name: /Choose my own cap/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a cap/i);
    expect(onChange).toHaveBeenLastCalledWith({ error: expect.any(String) });
  });

  it("rejects too many decimals and reports null", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("1.12345678");
    expect(screen.getByRole("alert")).toHaveTextContent(/too many decimals/i);
    expect(onChange).toHaveBeenLastCalledWith({ error: expect.any(String) });
  });

  it("rejects a cap below one charge and reports null", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("0.5");
    expect(screen.getByRole("alert")).toHaveTextContent(/must cover at least one charge/i);
    expect(onChange).toHaveBeenLastCalledWith({ error: expect.any(String) });
  });

  it("explains the remainder that can never be charged", async () => {
    const onChange = renderSelector();
    await chooseCustomCap("5.5");
    expect(onChange).toHaveBeenLastCalledWith({ cap: 55_000_000n });
    expect(screen.getByText(/can never be charged/i)).toBeInTheDocument();
  });
});
