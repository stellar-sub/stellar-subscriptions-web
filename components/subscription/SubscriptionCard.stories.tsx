import type { Meta, StoryObj } from "@storybook/react";
import { SubStatus, type Subscription } from "@/types";
import { SubscriptionCard } from "./SubscriptionCard";

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

const meta = {
  title: "Subscription/SubscriptionCard",
  component: SubscriptionCard,
  args: { sub: base, onChanged: () => {} },
} satisfies Meta<typeof SubscriptionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const Paused: Story = {
  args: { sub: { ...base, status: SubStatus.Paused } },
};

export const Cancelled: Story = {
  args: { sub: { ...base, status: SubStatus.Cancelled } },
};

export const CapReached: Story = {
  args: { sub: { ...base, status: SubStatus.Exhausted, totalCharged: 120_000_000n } },
};
