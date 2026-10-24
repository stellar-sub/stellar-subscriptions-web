import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { formatAmount, parseAmount } from "./format";

/**
 * Property tests: formatting a raw amount and parsing it back must yield the
 * same bigint, for any amount and precision within the supported range.
 */

const decimalsArb = fc.integer({ min: 0, max: 18 });

// Raw amounts up to a very large magnitude (well beyond typical token supply).
const amountArb = fc.bigInt({ min: 1n, max: 10n ** 30n });

const roundTrip = (value: bigint, decimals: number): bigint | null =>
  parseAmount(formatAmount(value, decimals), decimals);

describe("formatAmount / parseAmount round-trip", () => {
  it("holds for generated amounts and decimals", () => {
    fc.assert(
      fc.property(amountArb, decimalsArb, (value, decimals) => {
        expect(roundTrip(value, decimals)).toBe(value);
      }),
      { numRuns: 500 },
    );
  });

  it("holds for zero", () => {
    fc.assert(
      fc.property(decimalsArb, (decimals) => {
        // parseAmount rejects zero (not a positive amount), so assert the
        // formatted form directly and that parsing it yields null.
        expect(formatAmount(0n, decimals)).toBe("0");
        expect(parseAmount(formatAmount(0n, decimals), decimals)).toBeNull();
      }),
      { numRuns: 50 },
    );
  });

  it("holds for one unit", () => {
    fc.assert(
      fc.property(decimalsArb, (decimals) => {
        const oneUnit = 10n ** BigInt(decimals);
        expect(roundTrip(oneUnit, decimals)).toBe(oneUnit);
      }),
      { numRuns: 50 },
    );
  });

  it("holds for very large amounts", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 10n ** 24n, max: 10n ** 30n }),
        decimalsArb,
        (value, decimals) => {
          expect(roundTrip(value, decimals)).toBe(value);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("shrinks failures to a small example", () => {
    // A deliberately broken round-trip to prove fast-check shrinks the
    // counterexample down to the smallest failing input.
    const broken = (value: bigint, decimals: number): bigint | null => {
      const formatted = formatAmount(value, decimals);
      const parsed = parseAmount(formatted, decimals);
      // Drop the last raw unit to force a mismatch for any value > 1.
      return parsed === null ? null : parsed - 1n;
    };

    let smallest: bigint | null = null;
    try {
      fc.assert(
        fc.property(amountArb, decimalsArb, (value, decimals) => {
          expect(broken(value, decimals)).toBe(value);
        }),
        { numRuns: 100 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const match = /Counterexample: \[([^\]]+)\]/.exec(message);
      if (match) smallest = BigInt(match[1].split(",")[0].trim());
    }

    // The shrunk counterexample should be the smallest positive amount.
    expect(smallest).toBe(1n);
  });
});
