import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";
import type { RequestSummary } from "../types/request";

export function useRequestList() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No synchronous setState here: the first statement awaits, so React is not
  // asked to re-render mid-effect.
  const load = useCallback(async () => {
    try {
      const data = await api.listRequests();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Only ever called from an event handler, so flipping `loading` here is fine.
  const reload = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  return { requests, loading, error, reload };
}
