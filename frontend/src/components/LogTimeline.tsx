type Props = {
  logs: string[];
  /** Keep the last entry marked as active while work is still running. */
  live?: boolean;
};

/** The processing log, newest entry at the bottom, as a small timeline. */
export function LogTimeline({ logs, live = false }: Props) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted">No log entries yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {logs.map((entry, index) => {
        const isLast = index === logs.length - 1;
        return (
          <li key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  isLast && live ? "bg-brand animate-pulse" : "bg-muted"
                }`}
              />
              {!isLast && <span className="w-px flex-1 bg-border" />}
            </div>
            <span
              className={`pb-4 text-sm ${
                isLast ? "font-medium text-ink" : "text-body"
              }`}
            >
              {entry}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
