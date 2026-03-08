import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth";
import { sendError } from "../lib/http";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    sendError(res, 401, "MISSING_BEARER_TOKEN", "Missing bearer token");
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
    };
    next();
  } catch {
    sendError(res, 401, "INVALID_ACCESS_TOKEN", "Invalid access token");
  }
}
