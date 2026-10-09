import {
  approxDuration,
  describeInterval,
  formatAmount,
  formatLedgers,
  maxCharges,
  pluralize,
  shortAddress,
  unchargeableRemainder,
} from "@/lib/format";
import type { TokenInfo } from "@/types";

/**
 * The plain-language statement of what a subscriber is about to authorize.
 * SubscribeForm never offers the confirm button without this on screen.
 */
export function AuthorizationSummary({
  merchant,
  amountPerPeriod,
  intervalLedgers,
  cap,
  token,
}: {
  merchant: string;
  amountPerPeriod: bigint;
  intervalLedgers: number;
  cap: bigint;
  token: TokenInfo;
}) {
  const amount = `${formatAmount(amountPerPeriod, token.decimals)} ${token.symbol}`;
  const capText = `${formatAmount(cap, token.decimals)} ${token.symbol}`;
  const charges = maxCharges(cap, amountPerPeriod);
  const remainder = unchargeableRemainder(cap, amountPerPeriod);
  const lastChargeAfter = Number(charges - 1n) * intervalLedgers;

  return (
    <section aria-labelledby="authorization-heading" className="card space-y-4 border-brand/40 bg-brand/5 p-5">
      <h3 id="authorization-heading" className="font-semibold text-fg">
        What you&apos;re authorizing
      </h3>

      <ul className="space-y-3 text-sm text-fg">
        <li>
          <strong>{amount}</strong> per charge, at most once {describeInterval(intervalLedgers).replace(/^about /, "")}{" "}
          <span className="text-muted">({formatLedgers(intervalLedgers)} between charges)</span>, paid to merchant{" "}
          <span className="font-mono" title={merchant}>
            {shortAddress(merchant)}
          </span>
          .
        </li>
        <li>
          Never more than <strong>{capText}</strong> in total — that&apos;s at most{" "}
          <strong>{pluralize(charges, "charge")}</strong>.
          {remainder > 0n && (
            <span className="text-muted">
              {" "}
              The last {formatAmount(remainder, token.decimals)} {token.symbol} of the cap can never be charged,
              because every charge is exactly {amount}.
            </span>
          )}
        </li>
        <li>
          The first charge can happen as soon as you subscribe.
          {charges > 1n && (
            <span className="text-muted">
              {" "}
              If the merchant charges every period, the cap is used up after {approxDuration(lastChargeAfter)}.
            </span>
          )}
        </li>
        <li>
          You can pause or cancel at any time. <strong>After you cancel, no further charges can occur.</strong>
        </li>
      </ul>

      <p className="border-t border-line pt-3 text-xs text-muted">
        These limits are enforced by the subscription contract, not by this website. Freighter will ask you to
        approve the contract to spend up to your cap from your {token.symbol} balance — the same limit. Times are
        estimates: the contract counts ledgers, which close about every 5 seconds.
      </p>
    </section>
  );
}
