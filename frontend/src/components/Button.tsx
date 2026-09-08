import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm " +
  "font-medium font-display transition-colors disabled:cursor-not-allowed " +
  "disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-brand";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary:
    "bg-white text-ink border border-border hover:bg-bg hover:border-muted",
  danger: "bg-white text-status-error border border-red-200 hover:bg-red-50",
  ghost: "text-body hover:bg-bg hover:text-ink",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />
  );
}
