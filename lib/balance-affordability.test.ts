I need to see the source file to write accurate tests. Since I only have the test file's current content (empty), I'll write tests based on the described API and the plan step. Let me infer the likely signatures from the function names and the plan.

```typescript
import { describe, it, expect } from 'vitest';
import {
  describeAffordability,
  remainingAfterCommitment,
  balanceSufficient,
  getAffordabilityInfo,
} from './balance-affordability';

describe('remainingAfterCommitment', () => {
  it('returns the difference when balance exceeds committed spend', () => {
    expect(remainingAfterCommitment(1000n, 300n)).toBe(700n);
  });

  it('returns 0n when balance equals committed spend', () => {
    expect(remainingAfterCommitment(500n, 500n)).toBe(0n);
  });

  it('returns 0n when committed spend exceeds balance', () => {
    expect(remainingAfterCommitment(200n, 500n)).toBe(0n);
  });

  it('handles zero committed spend', () => {
    expect(remainingAfterCommitment(1000n, 0n)).toBe(1000n);
  });

  it('handles zero balance', () => {
    expect(remainingAfterCommitment(0n, 0n)).toBe(0n);
    expect(remainingAfterCommitment(0n, 100n)).toBe(0n);
  });
});

describe('balanceSufficient', () => {
  it('returns true when balance equals amount', () => {
    expect(balanceSufficient(500n, 500n)).toBe(true);
  });

  it('returns true when balance is greater than amount', () => {
    expect(balanceSufficient(1000n, 500n)).toBe(true);
  });

  it('returns false when balance is less than amount', () => {
    expect(balanceSufficient(400n, 500n)).toBe(false);
  });

  it('returns true when amount is zero', () => {
    expect(balanceSufficient(0n, 0n)).toBe(true);
    expect(balanceSufficient(100n, 0n)).toBe(true);
  });
});

describe('describeAffordability', () => {
  it("returns 'No charges configured' when amountPerCharge is 0n", () => {
    expect(describeAffordability(0n, 1000n)).toBe('No charges configured');
  });

  it('handles a zero balance', () => {
    const result = describeAffordability(100n, 0n);
    expect(typeof result).toBe('string');
    expect(result).not.toBe('No charges configured');
  });

  it('handles chargesAffordable === 0n', () => {
    const result = describeAffordability(100n, 50n);
    expect(typeof result).toBe('string');
    expect(result).not.toBe('No charges configured');
  });

  it('handles chargesAffordable === 1n', () => {
    const result = describeAffordability(100n, 100n);
    expect(typeof result).toBe('string');
    expect(result).not.toBe('No charges configured');
  });

  it("returns the '1000+' message when chargesAffordable > 1000n", () => {
    const result = describeAffordability(1n, 1001n);
    expect(result).toContain('1000+');
  });

  it('returns the 1000+ message when balance > 1000 * amountPerCharge', () => {
    const amountPerCharge = 10n;
    const balance = 1000n * amountPerCharge + 1n;
    const result = describeAffordability(amountPerCharge, balance);
    expect(result).toContain('1000+');
  });

  it('reports a normal count for moderate affordability', () => {
    const result = describeAffordability(100n, 500n);
    expect(typeof result).toBe('string');
    expect(result).not.toBe('No charges configured');
    expect(result).not.toContain('1000+');
  });
});

describe('getAffordabilityInfo', () => {
  it('reports sufficient when balance covers the charge', () => {
    const info = getAffordabilityInfo(100n, 500n);
    expect(info.sufficient).toBe(true);
  });

  it('reports insufficient when balance does not cover the charge', () => {
    const info = getAffordabilityInfo(100n, 50n);
    expect(info.sufficient).toBe(false);
  });

  it('includes a shortfall message when insufficient', () => {
    const info = getAffordabilityInfo(100n, 50n);
    expect(info.sufficient).toBe(false);
    expect(typeof info.message).toBe('string');
    expect(info.message.length).toBeGreaterThan(0);
  });

  it('reports chargesAffordable for a normal balance', () => {
    const info = getAffordabilityInfo(100n, 500n);
    expect(info.chargesAffordable).toBe(5n);
  });

  it('handles balance > 1000 * amountPerCharge', () => {
    const amountPerCharge = 10n;
    const balance = 1000n * amountPerCharge + 500n;
    const info = getAffordabilityInfo(amountPerCharge, balance);
    expect(info.sufficient).toBe(true);
    expect(info.chargesAffordable).toBeGreaterThan(1000n);
  });

  it('handles amountPerCharge === 0n', () => {
    const info = getAffordabilityInfo(0n, 500n);
    expect(typeof info.sufficient).toBe('boolean');
  });
});