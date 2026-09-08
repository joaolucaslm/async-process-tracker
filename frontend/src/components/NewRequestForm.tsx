import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./Card";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { parseNumbers } from "../lib/numbers";
import { ApiError, api } from "../lib/api";

const EXAMPLE = "10, 20, 5";

type Props = {
  /** Called with the new id after a request is created, before navigation. */
  onCreated?: (id: string) => void;
};

/**
 * The "list of numbers" form. Validates client-side with Zod (see
 * lib/numbers.ts), creates the request, then sends the user to its detail page.
 */
export function NewRequestForm({ onCreated }: Props) {
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parsed = parseNumbers(raw);
  const preview = parsed.ok ? parsed.numbers : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const result = parseNumbers(raw);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    setValidationError(null);

    setSubmitting(true);
    try {
      const accepted = await api.createRequest(result.numbers);
      onCreated?.(accepted.id);
      navigate(`/requests/${accepted.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong.";
      setSubmitError(message);
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor="numbers"
          className="mb-1.5 block font-display text-sm font-medium text-ink"
        >
          Numbers
        </label>
        <p className="mb-2 text-xs text-muted">
          Separate them with commas, spaces or new lines.
        </p>
        <textarea
          id="numbers"
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            if (validationError) setValidationError(null);
          }}
          rows={4}
          placeholder={EXAMPLE}
          className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
          aria-invalid={validationError ? true : undefined}
          aria-describedby={validationError ? "numbers-error" : undefined}
        />

        <div className="mt-2 min-h-5 text-xs">
          {validationError ? (
            <span id="numbers-error" className="text-status-error">
              {validationError}
            </span>
          ) : preview && preview.length > 0 ? (
            <span className="text-muted">
              {preview.length} number{preview.length === 1 ? "" : "s"} · sum will
              be{" "}
              <span className="font-medium text-body">
                {preview.reduce((a, b) => a + b, 0)}
              </span>
            </span>
          ) : null}
        </div>

        {submitError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-status-error">
            {submitError}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" className="cursor-pointer" disabled={submitting}>
            {submitting && <Spinner className="size-4" />}
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
          <button
            type="button"
            onClick={() => setRaw(EXAMPLE)}
            className="text-sm text-body underline-offset-2 hover:text-ink hover:underline cursor-pointer"
          >
            Use example
          </button>
        </div>
      </form>
    </Card>
  );
}
