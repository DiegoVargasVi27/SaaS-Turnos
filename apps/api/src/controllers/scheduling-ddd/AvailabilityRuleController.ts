import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CreateAvailabilityRule } from "../../application/scheduling/CreateAvailabilityRule";
import { ListAvailabilityRules } from "../../application/scheduling/ListAvailabilityRules";
import { SchedulingError } from "../../application/scheduling/SchedulingError";
import { requireAuth, requireRole } from "../../middleware/auth";
import { sendError } from "../../lib/http";

const createAvailabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  slotIntervalMinutes: z.number().int().positive(),
});

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

export interface AvailabilityRuleControllerDeps {
  createAvailabilityRule: CreateAvailabilityRule;
  listAvailabilityRules: ListAvailabilityRules;
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

export function createSchedulingAvailabilityRouter(deps: AvailabilityRuleControllerDeps): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireRole(["OWNER", "ADMIN"]));

  // POST / — create a new availability rule
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createAvailabilityRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "SCHEDULING_PAYLOAD_INVALID", "Invalid payload", parsed.error.flatten());
        return;
      }

      try {
        const result = await deps.createAvailabilityRule.execute({
          businessId: req.auth!.businessId,
          weekday: parsed.data.weekday,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          slotIntervalMinutes: parsed.data.slotIntervalMinutes,
        });
        res.status(201).json(result);
      } catch (error) {
        if (error instanceof SchedulingError) {
          sendError(res, mapSchedulingErrorStatus(error.code), error.code, error.message);
          return;
        }
        throw error;
      }
    }),
  );

  // GET / — list availability rules for business
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      try {
        const result = await deps.listAvailabilityRules.execute({
          businessId: req.auth!.businessId,
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

  return router;
}
