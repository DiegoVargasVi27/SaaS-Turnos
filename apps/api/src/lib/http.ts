import type { Response } from "express";

type ApiErrorPayload = {
  message: string;
  code: string;
  issues?: unknown;
};

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  issues?: unknown,
): void {
  const payload: ApiErrorPayload = { message, code };

  if (typeof issues !== "undefined") {
    payload.issues = issues;
  }

  res.status(status).json(payload);
}
