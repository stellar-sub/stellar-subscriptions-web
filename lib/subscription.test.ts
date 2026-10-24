import { SubStatus, type Subscription } from "@/types";
import {
  chargesLeft,
  committedByToken,
  filterDueSubscriptions,
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

describe("due subscriptions", () => {
  it("never asks the contract about rows that are not yet due", async () => {
    const checker = jest.fn(async () => true);
    const due = await filterDueSubscriptions(
      [
        sub({ id: 1, nextChargeLedger: 2_000 }),
        sub({ id: 2, nextChargeLedger: 1_000 }),
      ],
      1_000,
      checker,
    );
    expect(checker).toHaveBeenCalledTimes(1);
    expect(checker).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(due.map((s) => s.id)).toEqual([2]);
  });

  it("keeps the contract as the final authority", async () => {
    const checker = jest.fn(async (s: Subscription) => s.id === 1);
    const due = await filterDueSubscriptions(
      [
        sub({ id: 1, nextChargeLedger: 1_000 }),
        sub({ id: 2, nextChargeLedger: 1_000 }),
      ],
      1_000,
      checker,
    );
    expect(checker).toHaveBeenCalledTimes(2);
    expect(due.map((s) => s.id)).toEqual([1]);
  });

  it("excludes paused, cancelled and exhausted rows without asking the contract", async () => {
    const checker = jest.fn(async () => true);
    const due = await filterDueSubscriptions(
      [
        sub({ id: 1, status: SubStatus.Paused, nextChargeLedger: 1_000 }),
        sub({ id: 2, status: SubStatus.Cancelled, nextChargeLedger: 1_000 }),
        sub({ id: 3, status: SubStatus.Exhausted, nextChargeLedger: 1_000 }),
        sub({ id: 4, nextChargeLedger: 1_000 }),
      ],
      1_000,
      checker,
    );
    expect(checker).toHaveBeenCalledTimes(1);
    expect(checker).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
    expect(due.map((s) => s.id)).toEqual([4]);
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
