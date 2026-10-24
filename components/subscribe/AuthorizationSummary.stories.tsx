import type { Meta, StoryObj } from "@storybook/react";
import type { TokenInfo } from "@/types";
import { AuthorizationSummary } from "./AuthorizationSummary";

const XLM: TokenInfo = { contractId: "CXLM", symbol: "XLM", name: "native", decimals: 7 };

const meta = {
  title: "Subscribe/AuthorizationSummary",
  component: AuthorizationSummary,
  args: {
    merchant: "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU",
    amountPerPeriod: 10_000_000n,
    intervalLedgers: 720,
    cap: 120_000_000n,
    token: XLM,
  },
} satisfies Meta<typeof AuthorizationSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WholeNumberOfCharges: Story = {};

export const UnchargeableRemainder: Story = {
  args: { cap: 125_000_000n },
};

export const SingleCharge: Story = {
  args: { cap: 10_000_000n },
};
