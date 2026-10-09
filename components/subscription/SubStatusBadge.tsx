import { SubStatus } from "@/types";

const BADGES: Record<SubStatus, { label: string; hint: string; tone: string }> = {
  [SubStatus.Active]: {
    label: "Active",
    hint: "The merchant can charge once per interval, up to your cap.",
    tone: "border-ok/30 bg-ok/10 text-ok",
  },
  [SubStatus.Paused]: {
    label: "Paused",
    hint: "No charges can happen until you resume.",
    tone: "border-warn/30 bg-warn/10 text-warn",
  },
  [SubStatus.Cancelled]: {
    label: "Cancelled",
    hint: "Final. No further charges can ever happen.",
    tone: "border-line bg-raised text-muted",
  },
  [SubStatus.Exhausted]: {
    label: "Cap reached",
    hint: "The full cap has been charged. No further charges are possible.",
    tone: "border-line bg-raised text-muted",
  },
};

export function SubStatusBadge({ status }: { status: SubStatus }) {
  const badge = BADGES[status];
  return (
    <span title={badge.hint} className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.tone}`}>
      {badge.label}
    </span>
  );
}
