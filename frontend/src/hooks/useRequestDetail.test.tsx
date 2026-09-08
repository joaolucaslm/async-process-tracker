import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { RequestDetail } from "../types/request";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {},
  api: {
    getRequest: vi.fn(),
    cancelRequest: vi.fn(),
  },
}));

import { api } from "../lib/api";
import { useRequestDetail, POLL_INTERVAL_MS } from "./useRequestDetail";

const getRequest = vi.mocked(api.getRequest);

function detail(overrides: Partial<RequestDetail>): RequestDetail {
  return {
    id: "r1",
    status: "processing",
    progress: 30,
    numbers: [10, 20, 5],
    result: null,
    created_at: "2026-09-08T12:00:00Z",
    updated_at: "2026-09-08T12:00:03Z",
    logs: ["Request created"],
    ...overrides,
  };
}

const flush = () => act(async () => {});

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  getRequest.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRequestDetail polling", () => {
  it("keeps polling while the request is processing", async () => {
    getRequest.mockResolvedValue(detail({ status: "processing" }));

    const { result } = renderHook(() => useRequestDetail("r1"));
    await flush();

    expect(result.current.request).not.toBeNull();
    expect(getRequest).toHaveBeenCalledTimes(1);

    await tick(POLL_INTERVAL_MS);
    expect(getRequest).toHaveBeenCalledTimes(2);

    await tick(POLL_INTERVAL_MS);
    expect(getRequest).toHaveBeenCalledTimes(3);
    expect(result.current.isPolling).toBe(true);
  });

  it("stops polling once the status is completed", async () => {
    getRequest
      .mockResolvedValueOnce(detail({ status: "processing" }))
      .mockResolvedValueOnce(
        detail({ status: "completed", progress: 100, result: 35 }),
      );

    const { result } = renderHook(() => useRequestDetail("r1"));
    await flush();

    await tick(POLL_INTERVAL_MS);
    expect(result.current.request?.status).toBe("completed");
    expect(result.current.isPolling).toBe(false);

    const callsSoFar = getRequest.mock.calls.length;
    await tick(POLL_INTERVAL_MS * 4);
    expect(getRequest).toHaveBeenCalledTimes(callsSoFar);
  });

  it("stops polling once the status is error", async () => {
    getRequest
      .mockResolvedValueOnce(detail({ status: "processing" }))
      .mockResolvedValueOnce(detail({ status: "error" }));

    const { result } = renderHook(() => useRequestDetail("r1"));
    await flush();

    await tick(POLL_INTERVAL_MS);
    expect(result.current.request?.status).toBe("error");

    const callsSoFar = getRequest.mock.calls.length;
    await tick(POLL_INTERVAL_MS * 4);
    expect(getRequest).toHaveBeenCalledTimes(callsSoFar);
  });
});

describe("useRequestDetail error handling", () => {
  it("surfaces an error from the first load", async () => {
    getRequest.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useRequestDetail("r1"));
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.request).toBeNull();
  });
});
