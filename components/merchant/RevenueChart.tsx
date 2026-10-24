"use client";

import dynamic from "next/dynamic";

const RevenueChartInner = dynamic(() => import("./RevenueChartInner"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted"
    >
      Loading chart…
    </div>
  ),
});

export default RevenueChartInner;
