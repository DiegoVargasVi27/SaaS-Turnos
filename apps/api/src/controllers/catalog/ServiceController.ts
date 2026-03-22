import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { CreateServiceService } from "../../application/catalog/CreateServiceService";
import { UpdateServiceService } from "../../application/catalog/UpdateServiceService";
import { DeleteServiceService } from "../../application/catalog/DeleteServiceService";
import { ListServicesService } from "../../application/catalog/ListServicesService";
import { ServiceRepository } from "../../infrastructure/persistence/prisma/repositories/ServiceRepository";
import { DomainExceptionMapper } from "../errorHandling/DomainExceptionMapper";
import { CreateServiceDTO } from "../../dtos/catalog/CreateServiceDTO";
import { UpdateServiceDTO } from "../../dtos/catalog/UpdateServiceDTO";

// Validation schemas using Zod
const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  durationMin: z.number().int().positive().max(480).multipleOf(5),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).optional().default("USD"),
});

const updateServiceSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    durationMin: z.number().int().positive().max(480).multipleOf(5).optional(),
    priceCents: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * Create Service Router.
 * Factory function that creates and configures the Express router.
 * 
 * Endpoints:
 * - POST   /api/services       - Create service
 * - GET    /api/services       - List services (with optional activeOnly filter)
 * - PATCH  /api/services/:id   - Update service
 * - DELETE /api/services/:id   - Delete service (soft delete)
 * 
 * All endpoints require authentication and OWNER/ADMIN role.
 */
export function createServiceRouter(): Router {
  const router = Router();

  // Dependency injection (simple factory pattern)
  // In a larger app, you'd use a DI container
  const serviceRepo = new ServiceRepository();
  const createService = new CreateServiceService(serviceRepo);
  const updateService = new UpdateServiceService(serviceRepo);
  const deleteService = new DeleteServiceService(serviceRepo);
  const listServices = new ListServicesService(serviceRepo);

  /**
   * POST /api/services
   * Create a new service for the authenticated business.
   */
  router.post(
    "/",
    requireAuth,
    requireRole(["OWNER", "ADMIN"]),
    async (req: Request, res: Response) => {
      try {
        // Validate input with Zod
        const parsed = createServiceSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          });
        }

        // Assemble DTO
        const dto = new CreateServiceDTO(
          parsed.data.name,
          parsed.data.durationMin,
          parsed.data.priceCents,
          parsed.data.currency
        );

        // Execute use case
        const result = await createService.execute(req.auth!.businessId, dto);

        res.status(201).json(result);
      } catch (error) {
        DomainExceptionMapper.handle(error as Error, res);
      }
    }
  );

  /**
   * GET /api/services
   * List all services for the authenticated business.
   * Query param: ?activeOnly=true to filter only active services
   */
  router.get(
    "/",
    requireAuth,
    requireRole(["OWNER", "ADMIN"]),
    async (req: Request, res: Response) => {
      try {
        const activeOnly = req.query.activeOnly === "true";
        const result = await listServices.execute(req.auth!.businessId, activeOnly);
        res.json(result);
      } catch (error) {
        DomainExceptionMapper.handle(error as Error, res);
      }
    }
  );

  /**
   * PATCH /api/services/:id
   * Update an existing service.
   * At least one field must be provided.
   */
  router.patch(
    "/:id",
    requireAuth,
    requireRole(["OWNER", "ADMIN"]),
    async (req: Request, res: Response) => {
      try {
        // Validate input
        const parsed = updateServiceSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          });
        }

        // Assemble DTO
        const dto = new UpdateServiceDTO(
          parsed.data.name,
          parsed.data.durationMin,
          parsed.data.priceCents,
          parsed.data.currency,
          parsed.data.isActive
        );

        // Execute use case
        const serviceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await updateService.execute(serviceId, dto);
        res.json(result);
      } catch (error) {
        DomainExceptionMapper.handle(error as Error, res);
      }
    }
  );

  /**
   * DELETE /api/services/:id
   * Soft-delete a service (sets isActive = false).
   * 
   * Business rule: Cannot delete services with future appointments.
   * Returns 204 No Content on success.
   */
  router.delete(
    "/:id",
    requireAuth,
    requireRole(["OWNER", "ADMIN"]),
    async (req: Request, res: Response) => {
      try {
        const serviceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await deleteService.execute(serviceId);
        res.status(204).send();
      } catch (error) {
        DomainExceptionMapper.handle(error as Error, res);
      }
    }
  );

  return router;
}
