import type { ReactNode } from "react";
import { Link } from "react-router-dom";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-brand to-accent text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M12 3v9l6 3"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2.5"
            opacity="0.4"
          />
        </svg>
      </span>
      <span className="font-display text-[15px] font-semibold text-ink">
        Async Tracker
      </span>
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Brand />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-muted">
        Async Process Tracker — submit a list of numbers, watch it get summed in
        the background.
      </footer>
    </div>
  );
}
