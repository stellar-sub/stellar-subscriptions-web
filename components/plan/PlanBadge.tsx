export function PlanBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-xs font-medium text-ok">
      Accepting subscribers
    </span>
  ) : (
    <span
      className="rounded-full border border-line bg-raised px-2 py-0.5 text-xs font-medium text-muted"
      title="No new subscriptions. Existing ones continue exactly as their subscribers authorized."
    >
      Closed to new subscribers
    </span>
  );
}
