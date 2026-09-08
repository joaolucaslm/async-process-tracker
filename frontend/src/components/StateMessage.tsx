import type { ReactNode } from "react";
import { Spinner } from "./Spinner";
import { Button } from "./Button";

type Props = {
  title: string;
  description?: ReactNode;
  /** Show a spinner instead of the icon dot. */
  loading?: boolean;
  /** Renders a retry button when provided. */
  onRetry?: () => void;
  tone?: "neutral" | "error";
  children?: ReactNode;
};

/**
 * The shared empty / loading / error panel. Screens funnel all three
 * non-content states through here so they look and behave the same.
 */
export function StateMessage({
  title,
  description,
  loading = false,
  onRetry,
  tone = "neutral",
  children,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
      {loading ? (
        <Spinner className="size-6 text-brand" />
      ) : (
        <span
          className={`size-2.5 rounded-full ${
            tone === "error" ? "bg-status-error" : "bg-muted"
          }`}
        />
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="max-w-sm text-sm text-body">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}
