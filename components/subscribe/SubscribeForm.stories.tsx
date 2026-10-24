import type { Meta, StoryObj } from "@storybook/react";
import type { Plan, TokenInfo } from "@/types";
import { SubscribeForm } from "./SubscribeForm";

const XLM: TokenInfo = { contractId: "CXLM", symbol: "XLM", name: "native", decimals: 7 };
const merchant = "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU";

const plan: Plan = {
  id: 1,
  merchant,
  name: "Demo hourly",
  token: "CXLM",
  amountPerPeriod: 10_000_000n,
  intervalLedgers: 720,
  defaultCap: 120_000_000n,
  active: true,
  createdAt: 1,
};

const meta = {
  title: "Subscribe/SubscribeForm",
  component: SubscribeForm,
  args: { plan, token: XLM },
} satisfies Meta<typeof SubscribeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const NotConnected: Story = {
  parameters: { wallet: { address: null } },
};

export const FreighterMissing: Story = {
  parameters: { wallet: { address: null, installed: false } },
};

export const PlanClosed: Story = {
  args: { plan: { ...plan, active: false } },
};

export const OwnPlan: Story = {
  parameters: { wallet: { address: merchant } },
};
