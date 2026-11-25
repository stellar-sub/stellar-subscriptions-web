export function PlanSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted"></div>
        <div className="h-5 w-12 animate-pulse rounded bg-muted"></div>
      </div>

      <div className="space-y-1">
        <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
        <div className="h-4 w-32 animate-pulse rounded bg-muted"></div>
      </div>

      <div className="space-y-1">
        <div className="h-3 w-40 animate-pulse rounded bg-muted"></div>
        <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <dt className="h-3 w-16 animate-pulse rounded bg-muted"></dt>
          <dd className="h-4 w-20 animate-pulse rounded bg-muted"></dd>
        </div>
        <div className="space-y-1">
          <dt className="h-3 w-12 animate-pulse rounded bg-muted"></dt>
          <dd className="h-4 w-16 animate-pulse rounded bg-muted"></dd>
        </div>
        <div className="col-span-2 space-y-1">
          <dt className="h-3 w-16 animate-pulse rounded bg-muted"></dt>
          <dd className="h-4 w-24 animate-pulse rounded bg-muted"></dd>
        </div>
      </dl>
    </div>
  );
}

export function PlanSkeletonGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <li key={i} className="flex">
          <div className="w-full">
            <PlanSkeleton />
          </div>
        </li>
      ))}
    </ul>
  );
}
