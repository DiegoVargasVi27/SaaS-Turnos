import { Router, Request, Response } from "express";
import { z } from "zod";
import { registerSchema, loginSchema } from "@saas-turnos/shared";
import { RegisterUser } from "../../application/identity/RegisterUser";
import { LoginUser } from "../../application/identity/LoginUser";
import { RefreshSession } from "../../application/identity/RefreshSession";
import { RevokeToken } from "../../application/identity/RevokeToken";
import { sendError } from "../../lib/http";
import { IdentityError } from "../../application/identity/IdentityError";

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: (err: unknown) => void) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

function handleIdentityError(res: Response, error: IdentityError): void {
  const code = error.code;
  const mapping: Record<IdentityError["code"], number> = {
    IDENTITY_EMAIL_INVALID: 400,
    IDENTITY_PASSWORD_INVALID: 400,
    IDENTITY_INVALID_CREDENTIALS: 401,
    IDENTITY_USER_INACTIVE: 403,
    IDENTITY_USER_WITHOUT_BUSINESS: 403,
    IDENTITY_REFRESH_INVALID: 401,
    IDENTITY_REFRESH_REVOKED: 401,
    IDENTITY_EMAIL_CONFLICT: 409,
    IDENTITY_BUSINESS_SLUG_CONFLICT: 409,
    IDENTITY_UNEXPECTED: 500,
  };

  const status = mapping[code] ?? 500;
  sendError(res, status, code, error.message);
}

export interface IdentityControllerDeps {
  registerUser: RegisterUser;
  loginUser: LoginUser;
  refreshSession: RefreshSession;
  revokeToken: RevokeToken;
}

export function createIdentityRouter(deps: IdentityControllerDeps): Router {
  const router = Router();

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "IDENTITY_EMAIL_INVALID", "Invalid payload", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.registerUser.execute(parsed.data);
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof IdentityError) {
          handleIdentityError(res, err);
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "IDENTITY_INVALID_CREDENTIALS", "Invalid payload", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.loginUser.execute(parsed.data);
        res.json(result);
      } catch (err) {
        if (err instanceof IdentityError) {
          handleIdentityError(res, err);
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    "/refresh",
    asyncHandler(async (req, res) => {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "IDENTITY_REFRESH_INVALID", "refreshToken is required", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.refreshSession.execute(parsed.data);
        res.json(result);
      } catch (err) {
        if (err instanceof IdentityError) {
          handleIdentityError(res, err);
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    "/revoke",
    asyncHandler(async (req, res) => {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "IDENTITY_REFRESH_INVALID", "refreshToken is required", parsed.error.flatten());
        return;
      }

      try {
        await deps.revokeToken.execute(parsed.data);
        res.status(204).end();
      } catch (err) {
        if (err instanceof IdentityError) {
          handleIdentityError(res, err);
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
