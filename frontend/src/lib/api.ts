import {
  cancelResponseSchema,
  requestAcceptedSchema,
  requestDetailSchema,
  requestListSchema,
  type CancelResponse,
  type RequestAccepted,
  type RequestDetail,
  type RequestSummary,
} from "../types/request";
import { z } from "zod";

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Pull FastAPI's `{ "detail": ... }` out of an error response, if present. */
async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as unknown;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        // 422 from Pydantic: [{ msg, loc, ... }, ...]
        const first = detail[0] as { msg?: unknown };
        if (typeof first.msg === "string") return first.msg;
      }
    }
  } catch {
    /* body was not JSON */
  }
  return null;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(
      `Could not reach the API at ${BASE_URL}. Is the backend running?`,
      0,
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ApiError(
      detail ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  const data = (await response.json()) as unknown;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError("The API returned data in an unexpected shape.", 500);
  }
  return parsed.data;
}

export const api = {
  listRequests(): Promise<RequestSummary[]> {
    return request("/requests", requestListSchema);
  },

  getRequest(id: string): Promise<RequestDetail> {
    return request(`/requests/${id}`, requestDetailSchema);
  },

  createRequest(numbers: number[]): Promise<RequestAccepted> {
    return request("/requests", requestAcceptedSchema, {
      method: "POST",
      body: JSON.stringify({ numbers }),
    });
  },

  cancelRequest(id: string): Promise<CancelResponse> {
    return request(`/requests/${id}/cancel`, cancelResponseSchema, {
      method: "POST",
    });
  },
};
