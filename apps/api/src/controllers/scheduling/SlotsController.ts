import { Router, Request, Response } from "express";
import { z } from "zod";
import { GetAvailableSlotsService } from "../../application/scheduling/GetAvailableSlotsService";
import { AvailabilityRuleRepository } from "../../infrastructure/persistence/prisma/repositories/AvailabilityRuleRepository";
import { AppointmentRepository } from "../../infrastructure/persistence/prisma/repositories/AppointmentRepository";
import { ServiceRepository } from "../../infrastructure/persistence/prisma/repositories/ServiceRepository";
import { DomainExceptionMapper } from "../errorHandling/DomainExceptionMapper";
import { prisma } from "../../lib/prisma";

const getSlotsSchema = z.object({
  businessSlug: z.string().min(3),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Create Slots Router.
 * 
 * Endpoints:
 * - GET /api/appointments/slots - Get available slots (public, no auth required)
 */
export function createSlotsRouter(): Router {
  const router = Router();

  // Dependencies
  const availabilityRuleRepo = new AvailabilityRuleRepository();
  const appointmentRepo = new AppointmentRepository();
  const serviceRepo = new ServiceRepository();
  const getAvailableSlots = new GetAvailableSlotsService(
    availabilityRuleRepo,
    appointmentRepo,
    serviceRepo
  );

  /**
   * GET /api/appointments/slots
   * Get available time slots for a service on a specific date.
   * Public endpoint (no authentication required).
   * 
   * Query params:
   * - businessSlug: Business slug (e.g., "my-business")
   * - serviceId: Service UUID
   * - date: Date in YYYY-MM-DD format
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      // Validate query params
      const parsed = getSlotsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        });
      }

      // Resolve business by slug
      const business = await prisma.business.findUnique({
        where: { slug: parsed.data.businessSlug },
      });

      if (!business) {
        return res.status(404).json({
          error: "BUSINESS_NOT_FOUND",
          message: "Business not found",
        });
      }

      // Parse date
      const targetDate = new Date(`${parsed.data.date}T00:00:00.000Z`);

      // Execute use case
      const slots = await getAvailableSlots.execute(
        business.id,
        parsed.data.serviceId,
        targetDate
      );

      res.json({ slots });
    } catch (error) {
      DomainExceptionMapper.handle(error as Error, res);
    }
  });

  return router;
}
