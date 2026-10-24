export function Spinner({ label = "Loading", className = "h-4 w-4" }: { label?: string; className?: string }) {
  return (
    <svg
      className={`animate-spin motion-reduce:animate-none ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Centered spinner with a caption, for whole sections that are loading. */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner label={label} />
      <span>{label}</span>
    </div>
  );
}

/**
 * Card-shaped placeholder that mirrors the SubscriptionCard layout so the grid
 * keeps its dimensions while data loads (no layout shift on arrival).
 */
export function CardSkeleton() {
  return (
    <div
      className="animate-pulse motion-reduce:animate-none rounded-xl border border-border bg-surface p-5"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-border" />
          <div className="h-3 w-20 rounded bg-border" />
        </div>
        <div className="h-6 w-16 rounded-full bg-border" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-2 w-full rounded bg-border" />
        <div className="h-3 w-24 rounded bg-border" />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="h-3 w-28 rounded bg-border" />
        <div className="h-8 w-24 rounded-lg bg-border" />
      </div>
    </div>
  );
}

/**
 * Grid of card skeletons in the same layout as the subscription list, labelled
 * for assistive technology via a live status region.
 */
export function CardSkeletonGrid({
  count = 6,
  label = "Loading subscriptions",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
