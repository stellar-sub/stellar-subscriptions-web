import { SubStatus } from "@/types";

const BADGES: Record<SubStatus, { label: string; hint: string; tone: string }> = {
  [SubStatus.Active]: {
    label: "Active",
    hint: "The merchant can charge once per interval, up to your cap.",
    tone: "border-ok/40 bg-ok/15 text-ok-strong",
  },
  [SubStatus.Paused]: {
    label: "Paused",
    hint: "No charges can happen until you resume.",
    tone: "border-warn/40 bg-warn/15 text-warn-strong",
  },
  [SubStatus.Cancelled]: {
    label: "Cancelled",
    hint: "Final. No further charges can ever happen.",
    tone: "border-line bg-raised text-fg",
  },
  [SubStatus.Exhausted]: {
    label: "Cap reached",
    hint: "The full cap has been charged. No further charges are possible.",
    tone: "border-line bg-raised text-fg",
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