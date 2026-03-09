const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message ?? "Request failed");
    this.name = "ApiClientError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;

  if (!response.ok) {
    throw new ApiClientError(response.status, payload);
  }

  return payload as T;
}

export { API_URL };
