import { describe, expect, it } from "vitest";
import {
  isCancellable,
  isTerminal,
  requestDetailSchema,
} from "./request";

const VALID_DETAIL = {
  id: "abc",
  status: "processing",
  progress: 30,
  numbers: [10, 20, 5],
  result: null,
  created_at: "2026-09-08T12:00:00Z",
  updated_at: "2026-09-08T12:00:03Z",
  logs: ["Request created", "Starting processing..."],
};

describe("requestDetailSchema", () => {
  it("accepts a well-formed request object", () => {
    expect(requestDetailSchema.parse(VALID_DETAIL)).toMatchObject({
      id: "abc",
      status: "processing",
    });
  });

  it("rejects an unknown status", () => {
    const result = requestDetailSchema.safeParse({
      ...VALID_DETAIL,
      status: "paused",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    const { logs: _logs, ...withoutLogs } = VALID_DETAIL;
    void _logs;
    expect(requestDetailSchema.safeParse(withoutLogs).success).toBe(false);
  });
});

describe("status helpers", () => {
  it("treats completed, error and cancelled as terminal", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("error")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("processing")).toBe(false);
    expect(isTerminal("pending")).toBe(false);
  });

  it("allows cancelling only pending or processing requests", () => {
    expect(isCancellable("pending")).toBe(true);
    expect(isCancellable("processing")).toBe(true);
    expect(isCancellable("completed")).toBe(false);
  });
});
