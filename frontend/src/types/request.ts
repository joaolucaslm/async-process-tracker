import { z } from "zod";

/*
 * The API contract, expressed once as Zod schemas. Everything the app knows
 * about a request's shape is inferred from here (`z.infer`), so the static
 * types and the runtime validation can never drift apart.
 *
 * The case lists four statuses; the backend adds `cancelled` as its own value
 * (documented in backend/README.md) so a user-triggered stop is not confused
 * with a real processing failure. The union therefore carries five values.
 */
export const statusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "error",
  "cancelled",
]);

export type Status = z.infer<typeof statusSchema>;

/** Statuses from which nothing else will happen — polling can stop here. */
export const TERMINAL_STATUSES: readonly Status[] = [
  "completed",
  "error",
  "cancelled",
];

export function isTerminal(status: Status): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** A request still eligible for the cancel action. */
export function isCancellable(status: Status): boolean {
  return status === "pending" || status === "processing";
}

/** Row returned by `GET /requests` — identity and progress, no log history. */
export const requestSummarySchema = z.object({
  id: z.string(),
  status: statusSchema,
  progress: z.number(),
  numbers: z.array(z.number()),
  result: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RequestSummary = z.infer<typeof requestSummarySchema>;

/** Full object returned by `GET /requests/{id}` — the summary plus logs. */
export const requestDetailSchema = requestSummarySchema.extend({
  logs: z.array(z.string()),
});

export type RequestDetail = z.infer<typeof requestDetailSchema>;

/** Body of `POST /requests` — answers immediately, before processing runs. */
export const requestAcceptedSchema = z.object({
  id: z.string(),
  status: statusSchema,
});

export type RequestAccepted = z.infer<typeof requestAcceptedSchema>;

/** Confirmation returned by `POST /requests/{id}/cancel`. */
export const cancelResponseSchema = z.object({
  id: z.string(),
  status: statusSchema,
  message: z.string(),
});

export type CancelResponse = z.infer<typeof cancelResponseSchema>;

export const requestListSchema = z.array(requestSummarySchema);
