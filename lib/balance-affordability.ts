/**
 * Balance affordability calculations (#34)
 * Compare token balances with committed spend to show how many charges can be afforded
 */

/**
 * Calculate how many more charges a token balance can afford given committed spend
 * Returns a human-readable string describing the affordability
 */
export function describeAffordability(
  balance: bigint,
  amountPerCharge: bigint,
  token: string
): string {
  if (amountPerCharge === 0n) {
    return "No charges configured";
  }

  if (balance === 0n) {
    return "No balance available";
  }

  const chargesAffordable = balance / amountPerCharge;

  if (chargesAffordable === 0n) {
    return "Balance insufficient for even one charge";
  }

  if (chargesAffordable === 1n) {
    return "Your balance can afford 1 more charge";
  }

  // For large numbers, use scientific notation or simplified display
  if (chargesAffordable > 1000n) {
    return `Your balance can afford 1000+ more charges`;
  }

  return `Your balance can afford ${chargesAffordable} more charges`;
}

/**
 * Calculate remaining balance after committed spend
 */
export function remainingAfterCommitment(
  balance: bigint,
  committedSpend: bigint
): bigint {
  return balance > committedSpend ? balance - committedSpend : 0n;
}

/**
 * Check if balance is sufficient for committed spend
 */
export function balanceSufficient(balance: bigint, committedSpend: bigint): boolean {
  return balance >= committedSpend;
}

/**
 * Format affordability info with balance status
 * Returns object with status and human-readable message
 */
export function getAffordabilityInfo(
  balance: bigint,
  committedSpend: bigint,
  amountPerCharge: bigint,
  token: string
): {
  sufficient: boolean;
  chargesAffordable: bigint;
  message: string;
} {
  const sufficient = balanceSufficient(balance, committedSpend);
  const chargesAffordable = balance / amountPerCharge;

  let message = "";
  if (!sufficient) {
    const shortfall = committedSpend - balance;
    message = `Balance short by ${shortfall} ${token}. `;
  }
  message += describeAffordability(balance, amountPerCharge, token);

  return {
    sufficient,
    chargesAffordable,
    message,
  };
}
