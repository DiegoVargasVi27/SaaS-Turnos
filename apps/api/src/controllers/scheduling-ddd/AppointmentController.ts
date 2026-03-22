import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createAppointmentSchema as sharedSchema } from "@saas-turnos/shared";
import { BookAppointment } from "../../application/scheduling/BookAppointment";
import { CatalogError } from "../../application/catalog/CatalogError";
import { SchedulingError } from "../../application/scheduling/SchedulingError";
import { sendError } from "../../lib/http";

const createAppointmentSchema = sharedSchema.extend({
  startsAt: z.coerce.date(),
});

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

export interface SchedulingAppointmentControllerDeps {
  bookAppointment: BookAppointment;
}

export function createSchedulingAppointmentRouter(
  deps: SchedulingAppointmentControllerDeps,
): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "SCHEDULING_PAYLOAD_INVALID", "Invalid payload", parsed.error.flatten());
        return;
      }

      try {
        const dto = parsed.data;
        const appointment = await deps.bookAppointment.execute({
          businessSlug: dto.businessSlug,
          serviceId: dto.serviceId,
          startsAt: dto.startsAt,
          clientEmail: dto.clientEmail,
          clientName: dto.clientName,
          clientPhone: dto.clientPhone,
        });
        res.status(201).json(appointment);
      } catch (error) {
        if (error instanceof CatalogError) {
          sendError(res, 404, error.code, error.message);
          return;
        }
        if (error instanceof SchedulingError) {
          const statusMap: Record<SchedulingError["code"], number> = {
            SCHEDULING_BUSINESS_NOT_FOUND: 404,
            SCHEDULING_SERVICE_INACTIVE: 409,
            SCHEDULING_SLOT_TAKEN: 409,
            SCHEDULING_APPOINTMENT_NOT_FOUND: 404,
            SCHEDULING_APPOINTMENT_NOT_CANCELLABLE: 409,
            SCHEDULING_INVALID_AVAILABILITY_DATA: 400,
            SCHEDULING_AVAILABILITY_RULE_NOT_FOUND: 404,
          };
          sendError(res, statusMap[error.code] ?? 400, error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  return router;
}
