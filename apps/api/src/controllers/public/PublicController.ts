import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { sendError } from "../../lib/http";

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: (err: unknown) => void) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

export function createPublicRouter(): Router {
  const router = Router();

  router.get("/services", asyncHandler(async (req, res) => {
    const businessSlug = z.string().min(3).safeParse(req.query.businessSlug);
    if (!businessSlug.success) {
      sendError(res, 400, "INVALID_OR_MISSING_QUERY", "businessSlug is required");
      return;
    }

    const business = await prisma.business.findUnique({ where: { slug: businessSlug.data } });
    if (!business) {
      sendError(res, 404, "BUSINESS_NOT_FOUND", "Business not found");
      return;
    }

    const services = await prisma.service.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    res.json({ services });
  }));

  return router;
}
