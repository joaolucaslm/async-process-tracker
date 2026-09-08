import { z } from "zod";

const MAX_NUMBERS = 1000;

const numberSchema = z
  .number()
  .refine(Number.isFinite, "must be a finite number");

export const numbersSchema = z
  .array(numberSchema)
  .min(1, "Enter at least one number.")
  .max(MAX_NUMBERS, `That is more than ${MAX_NUMBERS} numbers.`);

export type ParseResult =
  | { ok: true; numbers: number[] }
  | { ok: false; error: string };

function tokenize(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function parseNumbers(raw: string): ParseResult {
  const tokens = tokenize(raw);

  if (tokens.length === 0) {
    return { ok: false, error: "Enter at least one number." };
  }

  const numbers: number[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (Number.isNaN(value)) {
      return { ok: false, error: `"${token}" is not a number.` };
    }
    numbers.push(value);
  }

  const parsed = numbersSchema.safeParse(numbers);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  return { ok: true, numbers: parsed.data };
}

export function summariseNumbers(numbers: number[], limit = 6): string {
  if (numbers.length === 0) return "—";
  const shown = numbers.slice(0, limit).join(", ");
  const rest = numbers.length - limit;
  return rest > 0 ? `${shown} … (+${rest} more)` : shown;
}
