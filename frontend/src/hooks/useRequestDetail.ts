import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";
import { isTerminal, type RequestDetail } from "../types/request";

export const POLL_INTERVAL_MS = 1500;

export function useRequestDetail(id: string) {
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPolling = request !== null && !error && !isTerminal(request.status);

  const fetchOnce = useCallback(
    async (isPoll: boolean) => {
      try {
        const next = await api.getRequest(id);
        setRequest(next);
        setError(null);
      } catch (err) {
        if (isPoll) return;
        setError(
          err instanceof ApiError ? err.message : "Something went wrong.",
        );
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    [id],
  );

  // First load.
  useEffect(() => {
    void fetchOnce(false);
  }, [fetchOnce]);

  // Poll only while the request is live; the effect tears the interval down as
  // soon as `isPolling` goes false.
  useEffect(() => {
    if (!isPolling) return;
    const timer = window.setInterval(() => {
      void fetchOnce(true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPolling, fetchOnce]);

  const cancel = useCallback(async () => {
    const result = await api.cancelRequest(id);
    setRequest((prev) => (prev ? { ...prev, status: result.status } : prev));
    await fetchOnce(false);
    return result;
  }, [id, fetchOnce]);

  return { request, loading, error, isPolling, cancel };
}
