export default function PlansLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-4 p-6"
    >
      <span className="sr-only">Loading plans…</span>
      <div className="h-8 w-48 animate-pulse rounded bg-muted" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-lg border bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
