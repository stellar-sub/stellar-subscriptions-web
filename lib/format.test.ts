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

import { readFileSync } from "node:fs";

describe("format.ts module style", () => {
  it("imports StrKey as an ES module instead of using require()", () => {
    const source = readFileSync(new URL("./format.ts", import.meta.url), "utf8");
    expect(source).toMatch(/import \{[^}]*StrKey[^}]*\} from "@stellar\/stellar-sdk"/);
    expect(source).not.toMatch(/require\("@stellar\/stellar-sdk"\)/);
  });
});
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { formatAmount, isValidStellarAddress, parseAmount, shortAddress } from "./format";

/**
 * Property tests: formatting a raw amount and parsing it back must yield the
 * same bigint, for any amount and precision within the supported range.
 */

const decimalsArb = fc.integer({ min: 0, max: 18 });

// Arbitrary positive raw amounts (unbounded above).
const amountArb = fc.bigInt({ min: 1n });

// Raw amounts up to a very large magnitude (well beyond typical token supply).
const boundedAmountArb = fc.bigInt({ min: 1n, max: 10n ** 30n });

const roundTrip = (value: bigint, decimals: number): bigint | null =>
  parseAmount(formatAmount(value, decimals), decimals);

describe("formatAmount / parseAmount round-trip", () => {
  it("holds for arbitrary bigints and decimals without precision loss", () => {
    fc.assert(
      fc.property(amountArb, decimalsArb, (value, decimals) => {
        expect(roundTrip(value, decimals)).toBe(value);
      }),
      { numRuns: 1000 },
    );
  });

  it("holds for generated amounts and decimals", () => {
    fc.assert(
      fc.property(boundedAmountArb, decimalsArb, (value, decimals) => {
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
        fc.property(boundedAmountArb, decimalsArb, (value, decimals) => {
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

const VALID_ADDRESS = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";

describe("isValidStellarAddress", () => {
  it("accepts a well-formed G-address", () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
  });

  it("rejects an address with a wrong first character", () => {
    expect(isValidStellarAddress("XBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4")).toBe(false);
  });

  it("rejects an address that is one character too short", () => {
    expect(isValidStellarAddress(VALID_ADDRESS.slice(1))).toBe(false);
  });

  it("rejects an address that is one character too long", () => {
    expect(isValidStellarAddress(VALID_ADDRESS + "A")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidStellarAddress("")).toBe(false);
  });

  it("rejects a contract address (C-prefix)", () => {
    expect(isValidStellarAddress("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC")).toBe(false);
  });
});

describe("shortAddress", () => {
  it("returns a 4-character address unchanged with keep=4", () => {
    const short = "ABCD";
    expect(short.length).toBe(4);
    const result = shortAddress(short, 4);
    expect(result).toBe(short);
  });

  it("returns an address at the exact boundary length unchanged", () => {
    // boundary = keep * 2 + 1 = 4 * 2 + 1 = 9
    const boundary = "ABCDEFGHI";
    expect(boundary.length).toBe(9);
    const result = shortAddress(boundary, 4);
    expect(result).toBe(boundary);
  });

  it("truncates an address longer than the boundary", () => {
    const long = "ABCDEFGHIJ";
    expect(long.length).toBe(10);
    const result = shortAddress(long, 4);
    expect(result).toBe("ABCD…GHIJ");
  });
});
