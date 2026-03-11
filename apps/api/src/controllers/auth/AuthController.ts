import { Router, Request, Response } from "express";
import { z } from "zod";
import { registerSchema, loginSchema } from "@saas-turnos/shared";
import { prisma } from "../../lib/prisma";
import {
  comparePassword,
  hashPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/auth";
import { config } from "../../config";
import { Role } from "@prisma/client";
import { sendError } from "../../lib/http";

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

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/register", asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_PAYLOAD", "Invalid payload", parsed.error.flatten());
      return;
    }

    const input = parsed.data;
    const passwordHash = await hashPassword(input.password);

    let user, business;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingSlug = await tx.business.findUnique({ where: { slug: input.businessSlug } });
        if (existingSlug) {
          throw Object.assign(new Error("Business slug already exists"), {
            appCode: "BUSINESS_SLUG_ALREADY_EXISTS" as const,
          });
        }

        const existingEmail = await tx.user.findUnique({ where: { email: input.email } });
        if (existingEmail) {
          throw Object.assign(new Error("Email already exists"), {
            appCode: "EMAIL_ALREADY_EXISTS" as const,
          });
        }

        const businessData = await tx.business.create({
          data: {
            name: input.businessName,
            slug: input.businessSlug,
          },
        });

        const userData = await tx.user.create({
          data: {
            email: input.email,
            fullName: input.fullName,
            passwordHash,
          },
        });

        await tx.businessUser.create({
          data: {
            businessId: businessData.id,
            userId: userData.id,
            role: Role.OWNER,
          },
        });

        return { user: userData, business: businessData };
      });
      user = result.user;
      business = result.business;
    } catch (err: unknown) {
      const appErr = err as { appCode?: string; message?: string };
      if (appErr.appCode === "BUSINESS_SLUG_ALREADY_EXISTS") {
        sendError(res, 409, "BUSINESS_SLUG_ALREADY_EXISTS", "Business slug already exists");
        return;
      }
      if (appErr.appCode === "EMAIL_ALREADY_EXISTS") {
        sendError(res, 409, "EMAIL_ALREADY_EXISTS", "Email already exists");
        return;
      }
      throw err;
    }

    const accessToken = signAccessToken({ sub: user.id, businessId: business.id, role: "OWNER" });
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      business: { id: business.id, slug: business.slug, name: business.name },
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  }));

  router.post("/login", asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_PAYLOAD", "Invalid payload", parsed.error.flatten());
      return;
    }

    const input = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { businessLinks: true },
    });

    if (!user) {
      sendError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
      return;
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      sendError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
      return;
    }

    const primaryLink = user.businessLinks[0];
    if (!primaryLink) {
      sendError(res, 403, "USER_WITHOUT_BUSINESS", "User is not linked to a business");
      return;
    }

    const accessToken = signAccessToken({
      sub: user.id,
      businessId: primaryLink.businessId,
      role: primaryLink.role,
    });
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken });
  }));

  router.post("/refresh", asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "MISSING_REFRESH_TOKEN", "refreshToken is required");
      return;
    }

    const token = parsed.data.refreshToken;

    try {
      const payload = verifyRefreshToken(token);
      const tokenHash = hashToken(token);
      const tokenRow = await prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!tokenRow) {
        sendError(res, 401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
        return;
      }

      const businessLink = await prisma.businessUser.findFirst({ where: { userId: payload.sub } });
      if (!businessLink) {
        sendError(res, 403, "NO_BUSINESS_CONTEXT", "No business context found");
        return;
      }

      const accessToken = signAccessToken({
        sub: payload.sub,
        businessId: businessLink.businessId,
        role: businessLink.role,
      });
      const refreshToken = signRefreshToken(payload.sub);

      await prisma.$transaction([
        prisma.refreshToken.update({ where: { id: tokenRow.id }, data: { revokedAt: new Date() } }),
        prisma.refreshToken.create({
          data: {
            userId: payload.sub,
            tokenHash: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      res.json({ accessToken, refreshToken });
    } catch {
      sendError(res, 401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }
  }));

  return router;
}
