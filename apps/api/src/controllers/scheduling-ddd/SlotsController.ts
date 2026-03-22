import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { GetServiceAvailability } from "../../application/catalog/GetServiceAvailability";
import { CatalogError } from "../../application/catalog/CatalogError";
import { sendError } from "../../lib/http";

const querySchema = z.object({
  businessSlug: z.string().min(3),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
});

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

export interface SchedulingSlotsControllerDeps {
  getServiceAvailability: GetServiceAvailability;
}

export function createSchedulingSlotsRouter(deps: SchedulingSlotsControllerDeps): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        sendError(res, 400, "SCHEDULING_QUERY_INVALID", "Invalid query params", parsed.error.flatten());
        return;
      }

      try {
        const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
        const result = await deps.getServiceAvailability.execute({
          businessSlug: parsed.data.businessSlug,
          serviceId: parsed.data.serviceId,
          date,
        });
        res.json({
          business: result.business,
          service: result.service,
          slots: result.slots,
        });
      } catch (error) {
        if (error instanceof CatalogError) {
          const status = error.code === "CATALOG_BUSINESS_NOT_FOUND" ? 404 : 404;
          sendError(res, status, error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  return router;
}
