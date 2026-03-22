import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { CreateAppointmentService } from "../../application/scheduling/CreateAppointmentService";
import { CancelAppointmentService } from "../../application/scheduling/CancelAppointmentService";
import { ListAppointmentsService } from "../../application/scheduling/ListAppointmentsService";
import { AvailabilityRuleRepository } from "../../infrastructure/persistence/prisma/repositories/AvailabilityRuleRepository";
import { AppointmentRepository } from "../../infrastructure/persistence/prisma/repositories/AppointmentRepository";
import { ServiceRepository } from "../../infrastructure/persistence/prisma/repositories/ServiceRepository";
import { DomainExceptionMapper } from "../errorHandling/DomainExceptionMapper";
import { CreateAppointmentDTO } from "../../dtos/scheduling/CreateAppointmentDTO";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";

// Validation schemas
const createAppointmentSchema = z.object({
  businessSlug: z.string().min(3),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  clientEmail: z.string().email(),
  clientName: z.string().min(2).max(100),
  clientPhone: z.string().min(5).max(20),
});

const listAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(PrismaStatus).optional(),
});

/**
 * Create Appointment Router.
 * 
 * Endpoints:
 * - POST   /api/appointments           - Create appointment (public, no auth)
 * - GET    /api/appointments           - List appointments (requires OWNER/ADMIN)
 * - PATCH  /api/appointments/:id/cancel - Cancel appointment (requires OWNER/ADMIN)
 */
export function createAppointmentRouter(): Router {
  const router = Router();

  // Dependencies
  const availabilityRuleRepo = new AvailabilityRuleRepository();
  const appointmentRepo = new AppointmentRepository();
  const serviceRepo = new ServiceRepository();
  const createAppointment = new CreateAppointmentService(
    availabilityRuleRepo,
    appointmentRepo,
    serviceRepo
  );
  const cancelAppointment = new CancelAppointmentService(appointmentRepo);
  const listAppointments = new ListAppointmentsService(appointmentRepo);

  /**
   * POST /api/appointments
   * Create a new appointment (book a slot).
   * Public endpoint (no authentication required).
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      // Validate input
      const parsed = createAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parsed.error.flatten(),
        });
      }

      // Assemble DTO
      const dto = new CreateAppointmentDTO(
        parsed.data.businessSlug,
        parsed.data.serviceId,
        new Date(parsed.data.startsAt),
        parsed.data.clientEmail,
        parsed.data.clientName,
        parsed.data.clientPhone
      );

      // Execute use case
      const result = await createAppointment.execute(dto);

      res.status(201).json(result);
    } catch (error) {
      DomainExceptionMapper.handle(error as Error, res);
    }
  });

  /**
   * GET /api/appointments
   * List appointments for the authenticated business.
   * Requires OWNER or ADMIN role.
   * 
   * Query params (optional):
   * - date: Filter by date (YYYY-MM-DD)
   * - status: Filter by status (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
   */
  router.get(
    "/",
    requireAuth,
    requireRole(["OWNER", "ADMIN"]),
    async (req: Request, res: Response) => {
      try {
        // Validate query params
        const parsed = listAppointmentsSchema.safeParse(req.query);
        if (!parsed.success) {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: parsed.error.flatten(),
          });
        }

        // Build filters
        const filters: { date?: Date; status?: PrismaStatus } = {};
        if (parsed.data.date) {
          filters.date = new Date(`${parsed.data.date}T00:00:00.000Z`);
        }
        if (parsed.data.status) {
          filters.status = parsed.data.status;
        }

        // Execute use case
        const appointments = await listAppointments.execute(
          req.auth!.businessId,
          filters
        );

        res.json({ appointments });
      } catch (error) {
        DomainExceptionMapper.handle(error as Error, res);
      }
    }
  );

  /**
   * PATCH /api/appointments/:id/cancel
   * Cancel an appointment.
   * Requires OWNER or ADMIN role.
   */
  router.patch(
    "/:id/cancel",
    requireAuth,
    requireRole(["OWNER", "ADMIN"]),
    async (req: Request, res: Response) => {
      try {
        // Get appointment ID from params (Express ensures it's a string, not an array)
        const appointmentId = String(req.params.id);

        // Validate UUID format
        if (!z.string().uuid().safeParse(appointmentId).success) {
          return res.status(400).json({
            error: "INVALID_ID",
            message: "Invalid appointment ID format",
          });
        }

        // Execute use case
        const result = await cancelAppointment.execute(appointmentId);

        return res.json(result);
      } catch (error) {
        DomainExceptionMapper.handle(error as Error, res);
      }
    }
  );

  return router;
}
