import { SubStatus, type Subscription } from "@/types";
import {
  chargesLeft,
  committedByToken,
  isFinal,
  ledgersUntilNextCharge,
  remainingCap,
  remainingChargeable,
  sortForDisplay,
} from "./subscription";

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    subscriber: "GSUB",
    merchant: "GMER",
    token: "CXLM",
    amountPerPeriod: 100n,
    intervalLedgers: 1_000,
    totalCap: 1_200n,
    totalCharged: 0n,
    startLedger: 10,
    lastChargeLedger: 0,
    nextChargeLedger: 10,
    status: SubStatus.Active,
    planId: 0,
    ...overrides,
  };
}

describe("remaining cap", () => {
  it("is the cap minus what has been charged", () => {
    expect(remainingCap(sub({ totalCharged: 300n }))).toBe(900n);
  });

  it("is zero once cancelled or exhausted, matching the contract", () => {
    expect(remainingCap(sub({ status: SubStatus.Cancelled, totalCharged: 300n }))).toBe(0n);
    expect(remainingCap(sub({ status: SubStatus.Exhausted, totalCharged: 1_200n }))).toBe(0n);
  });

  it("keeps the cap for a paused subscription", () => {
    expect(remainingCap(sub({ status: SubStatus.Paused, totalCharged: 300n }))).toBe(900n);
  });
});

describe("what can still be charged", () => {
  it("counts whole charges only", () => {
    const s = sub({ totalCap: 250n, totalCharged: 100n });
    expect(remainingCap(s)).toBe(150n);
    expect(chargesLeft(s)).toBe(1n);
    // 50 is left over but can never be charged: every charge is exactly 100.
    expect(remainingChargeable(s)).toBe(100n);
  });

  it("is zero when less than one period remains", () => {
    expect(remainingChargeable(sub({ totalCap: 250n, totalCharged: 200n }))).toBe(0n);
  });
});

describe("schedule", () => {
  it("reports ledgers until the next allowed charge", () => {
    expect(ledgersUntilNextCharge(sub({ nextChargeLedger: 1_500 }), 1_000)).toBe(500);
    expect(ledgersUntilNextCharge(sub({ nextChargeLedger: 1_000 }), 1_200)).toBe(-200);
  });

  it("knows which statuses are final", () => {
    expect(isFinal(sub({ status: SubStatus.Cancelled }))).toBe(true);
    expect(isFinal(sub({ status: SubStatus.Exhausted }))).toBe(true);
    expect(isFinal(sub({ status: SubStatus.Paused }))).toBe(false);
  });
});

describe("committed spend", () => {
  it("totals per token and ignores ended subscriptions", () => {
    const totals = committedByToken([
      sub({ id: 1, totalCharged: 200n }),
      sub({ id: 2, token: "CUSD", totalCap: 500n, amountPerPeriod: 50n }),
      sub({ id: 3, status: SubStatus.Cancelled }),
      sub({ id: 4, status: SubStatus.Paused, totalCharged: 1_100n }),
    ]);
    expect(totals.get("CXLM")).toBe(1_000n + 100n);
    expect(totals.get("CUSD")).toBe(500n);
    expect(totals.size).toBe(2);
  });
});

describe("display order", () => {
  it("puts active first, then paused, then ended, newest first within each", () => {
    const ordered = sortForDisplay([
      sub({ id: 1, status: SubStatus.Cancelled }),
      sub({ id: 2, status: SubStatus.Paused }),
      sub({ id: 3 }),
      sub({ id: 4 }),
      sub({ id: 5, status: SubStatus.Exhausted }),
    ]);
    expect(ordered.map((s) => s.id)).toEqual([4, 3, 2, 5, 1]);
  });
});
