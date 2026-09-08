import { STATUS_LABEL } from "../lib/format";
import type { Status } from "../types/request";

const STYLES: Record<Status, string> = {
  pending: "bg-slate-100 text-slate-600",
  processing: "bg-brand-soft text-brand",
  completed: "bg-green-50 text-status-completed",
  error: "bg-red-50 text-status-error",
  cancelled: "bg-amber-50 text-status-cancelled",
};

type Props = {
  status: Status;
  /** Pulse the dot while the request is live. */
  live?: boolean;
};

export function StatusBadge({ status, live = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium font-display ${STYLES[status]}`}
    >
      <span
        className={`size-1.5 rounded-full bg-current ${
          live ? "animate-pulse" : ""
        }`}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
