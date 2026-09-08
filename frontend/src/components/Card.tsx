import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: Props) {
  return (
    <div
      className={`rounded-card border border-border bg-surface shadow-card ${className}`}
      {...props}
    />
  );
}
