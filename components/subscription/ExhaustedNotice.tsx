import { SubStatus, type Subscription } from "@/types";

/**
 * Explains an exhausted subscription. Subscribers sometimes mistake it for a
 * cancelled one and look for a resume or resubscribe button that doesn't exist.
 */
export function ExhaustedNotice({ sub }: { sub: Subscription }) {
  if (sub.status !== SubStatus.Exhausted) return null;

  return (
    <div role="note" className="rounded border border-line p-4 text-sm text-muted">
      <p className="font-medium text-fg">This subscription can&apos;t be resumed.</p>
      <p className="mt-1">
        The full cap has been charged, so there is nothing left to bill. It wasn&apos;t cancelled, it has run its
        course. To keep going with this merchant, start a new subscription.
      </p>
    </div>
  );
}
