import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { formatNumber, timeAgo } from "../lib/format";
import { isTerminal, type RequestSummary } from "../types/request";
import { summariseNumbers } from "../lib/numbers";

export function RequestListItem({ request }: { request: RequestSummary }) {
  const live = !isTerminal(request.status);

  return (
    <Link
      to={`/requests/${request.id}`}
      className="block rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:border-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-ink">
            {summariseNumbers(request.numbers)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {request.numbers.length} number
            {request.numbers.length === 1 ? "" : "s"} · created{" "}
            {timeAgo(request.created_at)}
          </p>
        </div>
        <StatusBadge status={request.status} live={live} />
      </div>

      <div className="mt-3">
        <ProgressBar progress={request.progress} status={request.status} />
      </div>

      {request.result !== null && (
        <p className="mt-3 text-sm text-body">
          Result:{" "}
          <span className="font-display font-semibold text-ink">
            {formatNumber(request.result)}
          </span>
        </p>
      )}
    </Link>
  );
}
