import { useRequestList } from "../hooks/useRequestList";
import { RequestListItem } from "../components/RequestListItem";
import { StateMessage } from "../components/StateMessage";
import { NewRequestForm } from "../components/NewRequestForm";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";

/**
 * Screens 1 and 2 on one page: the request list and the "new request" form
 * side by side (the form drops above the list on narrow viewports).
 */
export function HomePage() {
  const { requests, loading, error, reload } = useRequestList();

  const showList = !error && (requests.length > 0 || !loading);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      {/* New request — right rail on desktop, on top on mobile */}
      <aside className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">New request</h2>
          <p className="mb-4 mt-1 text-sm text-body">
            A list of numbers. The backend sums them in four deliberately slow
            steps so there is progress to watch.
          </p>
          <NewRequestForm />
        </div>
      </aside>

      {/* Request list */}
      <section className="order-2 lg:order-1">
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Requests</h1>
            <p className="mt-1 text-sm text-body">
              Every processing request, newest first.
            </p>
          </div>
          {!loading && (
            <Button variant="secondary" onClick={reload} className="cursor-pointer">
              Refresh
            </Button>
          )}
        </header>

        {loading && requests.length === 0 && (
          <StateMessage loading title="Loading requests…" />
        )}

        {error && (
          <StateMessage
            tone="error"
            title="Could not load requests"
            description={error}
            onRetry={reload}
          />
        )}

        {showList && requests.length === 0 && (
          <StateMessage
            title="No requests yet"
            description="Create one with the form to see the background processing in action."
          />
        )}

        {showList && requests.length > 0 && (
          <>
            {loading && (
              <p className="mb-3 flex items-center gap-2 text-xs text-muted">
                <Spinner className="size-3" /> Refreshing…
              </p>
            )}
            <ul className="space-y-3">
              {requests.map((request) => (
                <li key={request.id}>
                  <RequestListItem request={request} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
