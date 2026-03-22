import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CreateService } from "../../application/catalog/CreateService";
import { ListServices } from "../../application/catalog/ListServices";
import { UpdateService } from "../../application/catalog/UpdateService";
import { DeleteService } from "../../application/catalog/DeleteService";
import { CatalogError } from "../../application/catalog/CatalogError";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/auth";
import { sendError } from "../../lib/http";

const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).optional(),
});

const updateServiceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  durationMinutes: z.number().int().positive().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});

const listServicesQuerySchema = z.object({
  includeInactive: z.union([z.literal("true"), z.literal("false")]).optional(),
});

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

export interface CatalogServiceControllerDeps {
  createService: CreateService;
  listServices: ListServices;
  updateService: UpdateService;
  deleteService: DeleteService;
}

function mapCatalogErrorStatus(code: CatalogError["code"]): number {
  const statusMap: Record<CatalogError["code"], number> = {
    CATALOG_BUSINESS_NOT_FOUND: 404,
    CATALOG_SERVICE_NOT_FOUND: 404,
    CATALOG_SERVICE_HAS_APPOINTMENTS: 409,
    CATALOG_INVALID_SERVICE_DATA: 400,
  };
  return statusMap[code] ?? 400;
}

export function createCatalogServiceRouter(deps: CatalogServiceControllerDeps): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireRole(["OWNER", "ADMIN"]));

  // POST / — create a new service
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "CATALOG_PAYLOAD_INVALID", "Invalid payload", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.createService.execute({
          businessId: req.auth!.businessId,
          name: parsed.data.name,
          durationMinutes: parsed.data.durationMinutes,
          priceCents: parsed.data.priceCents,
          currency: parsed.data.currency,
        });
        res.status(201).json(result);
      } catch (error) {
        if (error instanceof CatalogError) {
          sendError(res, mapCatalogErrorStatus(error.code), error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  // GET / — list services for business
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = listServicesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        sendError(res, 400, "CATALOG_QUERY_INVALID", "Invalid query params", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.listServices.execute({
          businessId: req.auth!.businessId,
          includeInactive: parsed.data.includeInactive === "true",
        });
        res.json(result);
      } catch (error) {
        if (error instanceof CatalogError) {
          sendError(res, mapCatalogErrorStatus(error.code), error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  // PATCH /:id — update a service
  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const parsed = updateServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "CATALOG_PAYLOAD_INVALID", "Invalid payload", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.updateService.execute({
          serviceId: req.params.id as string,
          businessId: req.auth!.businessId,
          ...parsed.data,
        });
        res.json(result);
      } catch (error) {
        if (error instanceof CatalogError) {
          sendError(res, mapCatalogErrorStatus(error.code), error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  // DELETE /:id — soft-delete a service
  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      try {
        await deps.deleteService.execute({
          serviceId: req.params.id as string,
          businessId: req.auth!.businessId,
        });
        res.status(204).send();
      } catch (error) {
        if (error instanceof CatalogError) {
          sendError(res, mapCatalogErrorStatus(error.code), error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  return router;
}
