import {
  approxDuration,
  capPercent,
  describeInterval,
  formatAmount,
  formatAmountWithSymbol,
  formatLedgers,
  maxCharges,
  parseAmount,
  pluralize,
  rawAmount,
  shortAddress,
  toUtcDay,
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

  it("follows the locale's grouping and decimal separators", () => {
    expect(formatAmount(12_500_000n, 7, undefined, "de-DE")).toBe("1,25");
    expect(formatAmount(123_456_789_012_345_678n, 7, undefined, "de-DE")).toBe(
      "12.345.678.901,2345678",
    );
    expect(formatAmount(12_500_000n, 7, undefined, "fr-FR")).toBe("1,25");
  });

  it("never changes the value of an amount across locales", () => {
    const locales = ["en-US", "de-DE", "fr-FR", "ja-JP", "hi-IN", "ar-EG"];
    const samples = [
      0n,
      1n,
      9_999_999n,
      10_000_000n,
      12_500_000n,
      123_456_789_012_345_678n,
      -50_000_000n,
    ];
    for (const locale of locales) {
      for (const raw of samples) {
        const formatted = formatAmount(raw, 7, undefined, locale);
        // Round-trip through the locale-agnostic parser must recover the raw value.
        const normalized = formatted.replace(/[^0-9.-]/g, "");
        const sign = raw < 0n ? -1n : 1n;
        const magnitude = raw < 0n ? -raw : raw;
        const whole = magnitude / 10_000_000n;
        const frac = magnitude % 10_000_000n;
        const expected = frac === 0n ? `${whole}` : `${whole}.${frac.toString().padStart(7, "0").replace(/0+$/, "")}`;
        expect(normalized).toBe(sign < 0n ? `-${expected}` : expected);
      }
    }
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

describe("exact amount helpers", () => {
  it("returns raw units as an exact string, never rounded", () => {
    expect(rawAmount(123_456_789_012_345_678_901_234_567n)).toBe(
      "123456789012345678901234567",
    );
    expect(rawAmount(0n)).toBe("0");
    expect(rawAmount(-42n)).toBe("-42");
  });

  it("formats an amount with its symbol and decimals", () => {
    expect(formatAmountWithSymbol(12_500_000n, 7, "USDC")).toBe("1.25 USDC");
    expect(formatAmountWithSymbol(10_000_000n, 7, "XLM")).toBe("1 XLM");
  });

  it("formats two tokens independently and never adds them", () => {
    const usdc = formatAmountWithSymbol(12_500_000n, 7, "USDC");
    const xlm = formatAmountWithSymbol(30_000_000n, 7, "XLM");
    expect(usdc).toBe("1.25 USDC");
    expect(xlm).toBe("3 XLM");
    expect(usdc).not.toContain("XLM");
    expect(xlm).not.toContain("USDC");
  });

  it("buckets timestamps by UTC day", () => {
    expect(toUtcDay(0)).toBe("1970-01-01");
    expect(toUtcDay(1_700_000_000)).toBe("2023-11-14");
    expect(toUtcDay(1_700_000_000)).toBe(toUtcDay(1_700_086_399));
    expect(toUtcDay(1_700_086_400)).toBe("2023-11-15");
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
