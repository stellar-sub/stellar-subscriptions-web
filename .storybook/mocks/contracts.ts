// Storybook stand-in for lib/contracts: keeps every real export, but replaces the
// network calls the components reach for with fixed, offline answers.
import type { TokenInfo } from "@/types";

export * from "../../lib/contracts";

export async function getTokenInfo(): Promise<TokenInfo> {
  return { contractId: "CXLM", symbol: "XLM", name: "native", decimals: 7 };
}

export async function getTokenBalance(): Promise<bigint> {
  return 1_000_000_000n;
}

export async function subscribe(): Promise<{ hash: string; id: number }> {
  return { hash: "storybook", id: 7 };
}

export async function cancelSubscription(): Promise<{ hash: string }> {
  return { hash: "storybook" };
}

export async function pauseSubscription(): Promise<{ hash: string }> {
  return { hash: "storybook" };
}

export async function resumeSubscription(): Promise<{ hash: string }> {
  return { hash: "storybook" };
}
