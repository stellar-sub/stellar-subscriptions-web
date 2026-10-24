import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help",
  description: "How caps, billing intervals, ledgers, pausing, cancelling and failed charges work, in plain language.",
};

const SECTIONS = [
  {
    id: "cap",
    title: "What a cap is",
    body: [
      "The cap is the most you can be charged in total under one subscription. The subscription contract checks it on every charge and refuses any charge that would take the total past the cap.",
      "Your wallet also asks you to approve the contract to spend up to the cap from your balance. The approval and the cap are the same limit. Once the cap has been used up, nothing more can be charged.",
    ],
  },
  {
    id: "interval",
    title: "Why at most one charge per interval",
    body: [
      "Every plan has a billing interval, such as every day or every 30 days. The contract records when the last charge happened and refuses another one until a full interval has passed.",
      "So a merchant can charge you once per interval: not twice within one, not early, and not on any schedule other than the one the contract enforces. Every charge is exactly the plan's amount per period. If the cap isn't a whole multiple of that amount, the leftover can never be charged.",
    ],
  },
  {
    id: "time",
    title: "Why times are estimates",
    body: [
      "The contract counts ledgers, not clock time. A Stellar ledger closes about every 5 seconds, so \"every day\" means about 17,280 ledgers, and real times drift with network speed.",
      "Every time shown on this site is an estimate, and is worded as one.",
    ],
  },
  {
    id: "pause-cancel",
    title: "What pause and cancel do",
    body: [
      "Only you, the subscriber, can pause, resume or cancel a subscription. While it is paused, no charge can happen. Resume it to allow charges again.",
      "Cancelling is permanent for charges: once you cancel, no further charges can ever happen on that subscription.",
    ],
  },
  {
    id: "failed-charge",
    title: "What happens when a charge fails",
    body: [
      "If a charge fails, nothing is taken. The usual cause is a balance or spending approval that is too low. The contract reports that nothing was charged.",
      "Check your balance and approval on My subscriptions. A failed charge never lets a merchant go past the cap or the interval.",
    ],
  },
];

const MERCHANT_CAN = [
  "Charge the plan's amount per period to your subscription, and only to your subscription.",
  "Charge once per billing interval, once the interval has passed.",
  "Charge while the subscription is active and not paused, up to the cap you authorized.",
];

const MERCHANT_CANNOT = [
  "Charge more than the cap, or charge after the full cap has been used.",
  "Charge more than once in an interval, or charge early.",
  "Charge after you have cancelled, or while you have paused.",
  "Charge a different amount than the plan's amount per period.",
  "Pause, resume or cancel your subscription. Only you can do that.",
];

export default function HelpPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">Help</h1>
        <p className="text-sm text-muted">
          Plain-language answers to check your understanding before you sign. The rules below are enforced by the
          subscription smart contract, not by this website.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="space-y-3">
          <h2 id={`${section.id}-heading`} className="text-lg font-semibold text-fg">
            {section.title}
          </h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="text-sm text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section id="merchants" aria-labelledby="merchants-heading" className="card space-y-4 p-5">
        <h2 id="merchants-heading" className="text-lg font-semibold text-fg">
          What a merchant can and cannot do
        </h2>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-fg">A merchant can</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {MERCHANT_CAN.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-fg">A merchant cannot</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {MERCHANT_CANNOT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-sm text-muted">
        Ready to look at a plan? <Link href="/plans" className="text-brand hover:underline">Browse plans</Link>.
      </p>
    </article>
  );
}
