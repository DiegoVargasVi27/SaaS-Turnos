import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ListAppointments } from "../../application/scheduling/ListAppointments";
import { CancelAppointment } from "../../application/scheduling/CancelAppointment";
import { SchedulingError } from "../../application/scheduling/SchedulingError";
import { InvalidStatusTransitionException } from "../../domain/scheduling/exceptions/InvalidStatusTransitionException";
import { requireAuth, requireRole } from "../../middleware/auth";
import { sendError } from "../../lib/http";

const listAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).optional(),
  status: z.string().optional(),
  serviceId: z.string().uuid().optional(),
});

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

export interface AppointmentManagementControllerDeps {
  listAppointments: ListAppointments;
  cancelAppointment: CancelAppointment;
}

function mapSchedulingErrorStatus(code: SchedulingError["code"]): number {
  const statusMap: Record<SchedulingError["code"], number> = {
    SCHEDULING_BUSINESS_NOT_FOUND: 404,
    SCHEDULING_SERVICE_INACTIVE: 409,
    SCHEDULING_SLOT_TAKEN: 409,
    SCHEDULING_APPOINTMENT_NOT_FOUND: 404,
    SCHEDULING_APPOINTMENT_NOT_CANCELLABLE: 409,
    SCHEDULING_INVALID_AVAILABILITY_DATA: 400,
    SCHEDULING_AVAILABILITY_RULE_NOT_FOUND: 404,
  };
  return statusMap[code] ?? 400;
}

export function createSchedulingAppointmentManagementRouter(
  deps: AppointmentManagementControllerDeps,
): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireRole(["OWNER", "ADMIN"]));

  // GET / — list appointments with filters
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = listAppointmentsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        sendError(res, 400, "SCHEDULING_QUERY_INVALID", "Invalid query params", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.listAppointments.execute({
          businessId: req.auth!.businessId,
          date: parsed.data.date,
          status: parsed.data.status,
          serviceId: parsed.data.serviceId,
        });
        res.json(result);
      } catch (error) {
        if (error instanceof SchedulingError) {
          sendError(res, mapSchedulingErrorStatus(error.code), error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  // POST /:id/cancel — cancel an appointment
  router.post(
    "/:id/cancel",
    asyncHandler(async (req, res) => {
      try {
        const result = await deps.cancelAppointment.execute({
          appointmentId: req.params.id as string,
          businessId: req.auth!.businessId,
        });
        res.json(result);
      } catch (error) {
        if (error instanceof SchedulingError) {
          sendError(res, mapSchedulingErrorStatus(error.code), error.code, error.message);
          return;
        }
        if (error instanceof InvalidStatusTransitionException) {
          sendError(res, 409, "INVALID_STATUS_TRANSITION", error.message);
          return;
        }
        throw error;
      }
    }),
  );

  return router;
}
