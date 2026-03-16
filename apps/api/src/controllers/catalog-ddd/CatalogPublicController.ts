import { Router, Request, Response } from "express";
import { z } from "zod";
import { ListCatalogServices } from "../../application/catalog/ListCatalogServices";
import { CatalogError } from "../../application/catalog/CatalogError";
import { sendError } from "../../lib/http";

const querySchema = z.object({
  businessSlug: z.string().min(3),
  includeAvailability: z.union([z.literal("true"), z.literal("false")]).optional(),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).optional(),
  slots: z.coerce.number().int().min(1).max(20).optional(),
});

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (err: unknown) => void) => {
    void handler(req, res).catch(next);
  };
}

export interface CatalogPublicControllerDeps {
  listCatalogServices: ListCatalogServices;
}

export function createCatalogPublicRouter(deps: CatalogPublicControllerDeps): Router {
  const router = Router();

  router.get(
    "/services",
    asyncHandler(async (req, res) => {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        sendError(res, 400, "CATALOG_QUERY_INVALID", "Invalid query params", parsed.error.flatten());
        return;
      }

      try {
        const date = parsed.data.date ? new Date(`${parsed.data.date}T00:00:00.000Z`) : undefined;
        const includeAvailability = parsed.data.includeAvailability === "true";
        const result = await deps.listCatalogServices.execute({
          businessSlug: parsed.data.businessSlug,
          includeAvailability,
          date,
          slotsPerService: parsed.data.slots,
        });
        res.json(result);
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
