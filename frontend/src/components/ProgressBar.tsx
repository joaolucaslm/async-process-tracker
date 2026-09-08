import type { Status } from "../types/request";

const FILL: Record<Status, string> = {
  pending: "bg-muted",
  processing: "bg-brand",
  completed: "bg-status-completed",
  error: "bg-status-error",
  cancelled: "bg-status-cancelled",
};

type Props = {
  progress: number;
  status: Status;
};

export function ProgressBar({ progress, status }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium font-display text-muted">
          Progress
        </span>
        <span className="text-sm font-semibold font-display text-ink tabular-nums">
          {clamped}%
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${FILL[status]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
