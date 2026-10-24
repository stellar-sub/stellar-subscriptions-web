import type { Meta, StoryObj } from "@storybook/react";
import type { Plan } from "@/types";
import { PlanCard } from "./PlanCard";

const base: Plan = {
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

const meta = {
  title: "Plan/PlanCard",
  component: PlanCard,
  args: { plan: base },
} satisfies Meta<typeof PlanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AcceptingSubscribers: Story = {};

export const Closed: Story = {
  args: { plan: { ...base, active: false } },
};
