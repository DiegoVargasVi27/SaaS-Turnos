import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token" });
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
    res.status(401).json({ message: "Invalid access token" });
  }
}
