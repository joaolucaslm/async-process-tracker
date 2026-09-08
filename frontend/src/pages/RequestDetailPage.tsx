import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRequestDetail } from "../hooks/useRequestDetail";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";
import { StateMessage } from "../components/StateMessage";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { LogTimeline } from "../components/LogTimeline";
import { formatNumber, timeAgo } from "../lib/format";
import { summariseNumbers } from "../lib/numbers";
import { ApiError } from "../lib/api";
import { isCancellable } from "../types/request";

export function RequestDetailPage() {
  const { id = "" } = useParams();
  // Remount on id change so the polling hook starts clean for the new request.
  return (
    <div className="mx-auto max-w-3xl">
      <RequestDetailView key={id} id={id} />
    </div>
  );
}

function RequestDetailView({ id }: { id: string }) {
  const navigate = useNavigate();
  const { request, loading, error, isPolling, cancel } = useRequestDetail(id);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelError(null);
    setCancelling(true);
    try {
      await cancel();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not cancel the request.";
      setCancelError(message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <StateMessage loading title="Loading request…" />;
  }

  if (error || !request) {
    return (
      <StateMessage
        tone="error"
        title="Request not found"
        description={error ?? "This request does not exist."}
      >
        <Link to="/" className="mt-1">
          <Button variant="secondary">Back to requests</Button>
        </Link>
      </StateMessage>
    );
  }

  const canCancel = isCancellable(request.status);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium font-display text-body transition-colors hover:border-muted hover:text-ink cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Requests
      </button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Request detail</h1>
          <p className="mt-1 font-mono text-xs text-muted">{request.id}</p>
        </div>
        <StatusBadge status={request.status} live={isPolling} />
      </header>

      <Card className="p-5 sm:p-6">
        <ProgressBar progress={request.progress} status={request.status} />

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted">Numbers</dt>
            <dd className="mt-0.5 text-ink">
              {summariseNumbers(request.numbers, 12)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Result</dt>
            <dd className="mt-0.5 font-display font-semibold text-ink">
              {request.result === null ? "—" : formatNumber(request.result)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Created</dt>
            <dd className="mt-0.5 text-body">{timeAgo(request.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Updated</dt>
            <dd className="mt-0.5 text-body">{timeAgo(request.updated_at)}</dd>
          </div>
        </dl>

        <div className="mt-5 flex items-center gap-3 border-t border-border pt-5">
          {canCancel ? (
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling && <Spinner className="size-4" />}
              {cancelling ? "Cancelling…" : "Cancel request"}
            </Button>
          ) : (
            <p className="text-sm text-muted">
              This request has finished — nothing left to cancel.
            </p>
          )}
          {isPolling && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Spinner className="size-3" /> Live — updating every 1.5s
            </span>
          )}
        </div>

        {cancelError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-status-error">
            {cancelError}
          </p>
        )}
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">
          Logs
        </h2>
        <Card className="p-5 sm:p-6">
          <LogTimeline logs={request.logs} live={isPolling} />
        </Card>
      </section>
    </div>
  );
}
