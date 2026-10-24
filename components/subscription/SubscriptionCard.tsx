import Link from "next/link";
import { Subscription } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import CancelButton from "./CancelButton";
import PauseButton from "./PauseButton";

type Props = {
  subscription: Subscription;
};

export default function SubscriptionCard({ subscription }: Props) {
  const {
    id,
    planName,
    merchantName,
    amount,
    currency,
    interval,
    nextChargeAt,
    status,
  } = subscription;

  const isActive = status === "active";
  const isPaused = status === "paused";

  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-600"
      aria-labelledby={`subscription-${id}-title`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3
            id={`subscription-${id}-title`}
            className="text-base font-semibold text-gray-900"
          >
            <Link
              href={`/plans/${id}`}
              className="rounded underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {planName}
            </Link>
          </h3>
          <p className="text-sm text-gray-600">{merchantName}</p>
        </div>
        <span
          className={
            isActive
              ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
              : isPaused
                ? "rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"
                : "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
          }
        >
          {status}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-gray-500">Amount</dt>
          <dd className="font-medium text-gray-900">
            {formatCurrency(amount, currency)} / {interval}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Next charge</dt>
          <dd className="font-medium text-gray-900">
            {isActive ? formatDate(nextChargeAt) : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/plans/${id}`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          View plan
        </Link>
        {isActive && <PauseButton subscriptionId={id} />}
        {(isActive || isPaused) && <CancelButton subscriptionId={id} />}
      </div>
    </article>
  );
}
