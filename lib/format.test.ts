import {
  approxDuration,
  capPercent,
  describeInterval,
  formatAmount,
  formatLedgers,
  maxCharges,
  parseAmount,
  pluralize,
  shortAddress,
  unchargeableRemainder,
} from "./format";

describe("formatAmount", () => {
  it("trims trailing zeros", () => {
    expect(formatAmount(12_500_000n, 7)).toBe("1.25");
    expect(formatAmount(10_000_000n, 7)).toBe("1");
    expect(formatAmount(0n, 7)).toBe("0");
  });

  it("groups the whole part", () => {
    expect(formatAmount(123_456_789_012_345_678n, 7)).toBe("12,345,678,901.2345678");
  });

  it("truncates, never rounds, to the requested fraction digits", () => {
    expect(formatAmount(1_234_567n, 7, 2)).toBe("0.12");
    expect(formatAmount(19_999_999n, 7, 2)).toBe("1.99");
  });

  it("keeps the sign of negative values", () => {
    expect(formatAmount(-50_000_000n, 7)).toBe("-5");
  });
});

describe("parseAmount", () => {
  it("parses decimals into raw units", () => {
    expect(parseAmount("1.25", 7)).toBe(12_500_000n);
    expect(parseAmount("1,000", 7)).toBe(10_000_000_000n);
    expect(parseAmount("5.", 7)).toBe(50_000_000n);
  });

  it("rejects zero, negatives, junk and excess precision", () => {
    expect(parseAmount("0", 7)).toBeNull();
    expect(parseAmount("-1", 7)).toBeNull();
    expect(parseAmount("abc", 7)).toBeNull();
    expect(parseAmount("", 7)).toBeNull();
    expect(parseAmount("1.12345678", 7)).toBeNull();
  });
});

describe("cap arithmetic", () => {
  it("counts whole charges the cap allows", () => {
    expect(maxCharges(1_200n, 100n)).toBe(12n);
    expect(maxCharges(250n, 100n)).toBe(2n);
    expect(maxCharges(100n, 0n)).toBe(0n);
  });

  it("reports the part of the cap that can never be charged", () => {
    expect(unchargeableRemainder(250n, 100n)).toBe(50n);
    expect(unchargeableRemainder(1_200n, 100n)).toBe(0n);
  });

  it("computes progress against the cap, clamped to 0-100", () => {
    expect(capPercent(100n, 1_200n)).toBe(8.33);
    expect(capPercent(1_200n, 1_200n)).toBe(100);
    expect(capPercent(1_300n, 1_200n)).toBe(100);
    expect(capPercent(0n, 0n)).toBe(0);
  });
});

describe("ledger time", () => {
  it("names preset intervals exactly", () => {
    expect(describeInterval(720)).toBe("every hour");
    expect(describeInterval(17_280)).toBe("every day");
    expect(describeInterval(120_960)).toBe("every week");
  });

  it("marks other intervals as approximate", () => {
    const threeDaysFourHours = 3 * 17_280 + 4 * 720;
    expect(describeInterval(threeDaysFourHours)).toBe("about every 3 days 4 hours");
  });

  it("describes a ledger span as an estimate", () => {
    expect(approxDuration(17_280)).toBe("about 1 day");
    expect(approxDuration(12)).toBe("about 1 minute");
  });

  it("formats ledger counts", () => {
    expect(formatLedgers(17_280)).toBe("17,280 ledgers");
    expect(formatLedgers(1)).toBe("1 ledger");
  });
});

describe("text helpers", () => {
  it("shortens addresses", () => {
    expect(shortAddress("GABCDEFGHIJKLMNOP")).toBe("GABC…MNOP");
    expect(shortAddress("GAB")).toBe("GAB");
  });

  it("pluralizes", () => {
    expect(pluralize(1, "charge")).toBe("1 charge");
    expect(pluralize(12n, "charge")).toBe("12 charges");
  });
});
