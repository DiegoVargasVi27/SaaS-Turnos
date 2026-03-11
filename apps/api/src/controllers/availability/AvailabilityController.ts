import { Router, Request, Response } from "express";
import { availabilitySchema } from "@saas-turnos/shared";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { sendError } from "../../lib/http";
import { Role } from "@prisma/client";

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: (err: unknown) => void) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

export function createAvailabilityRouter(): Router {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    requireRole([Role.OWNER, Role.ADMIN]),
    asyncHandler(async (req, res) => {
      const rules = await prisma.availabilityRule.findMany({
        where: { businessId: req.auth!.businessId },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      });
      res.json(rules);
    }),
  );

  router.post(
    "/",
    requireAuth,
    requireRole([Role.OWNER, Role.ADMIN]),
    asyncHandler(async (req, res) => {
      const parsed = availabilitySchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "INVALID_PAYLOAD", "Invalid payload", parsed.error.flatten());
        return;
      }

      if (parsed.data.endTime <= parsed.data.startTime) {
        sendError(res, 400, "INVALID_TIME_RANGE", "endTime must be after startTime");
        return;
      }

      const rule = await prisma.availabilityRule.create({
        data: {
          businessId: req.auth!.businessId,
          ...parsed.data,
        },
      });

      res.status(201).json(rule);
    }),
  );

  return router;
}
