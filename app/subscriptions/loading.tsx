export default function SubscriptionsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-4 p-6"
    >
      <span className="sr-only">Loading subscriptions…</span>
      <div className="h-8 w-56 animate-pulse rounded bg-muted" aria-hidden="true" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
