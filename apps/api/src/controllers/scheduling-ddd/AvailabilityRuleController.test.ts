import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchedulingAvailabilityRouter } from "./AvailabilityRuleController";
import { CreateAvailabilityRule } from "../../application/scheduling/CreateAvailabilityRule";
import { ListAvailabilityRules } from "../../application/scheduling/ListAvailabilityRules";
import { SchedulingError } from "../../application/scheduling/SchedulingError";
import { AvailabilityRuleDTO } from "../../dtos/scheduling/AvailabilityRuleDTO";

// Stub auth middleware
vi.mock("../../middleware/auth", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.auth = { userId: "user-1", businessId: "27d664fa-e366-4258-9c27-acbc359489d7", role: "OWNER" };
    next();
  },
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => {
    next();
  },
}));

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const RULE_ID = "a401822e-5c69-4f97-800c-2880a9a68a00";

const SAMPLE_RULE_DTO = new AvailabilityRuleDTO(
  RULE_ID,
  BIZ_ID,
  1,
  "Monday",
  "09:00",
  "17:00",
  30,
  true,
);

describe("AvailabilityRuleController", () => {
  const createAvailabilityRuleExecute = vi.fn();
  const listAvailabilityRulesExecute = vi.fn();

  const createAvailabilityRule = {
    execute: createAvailabilityRuleExecute,
  } as unknown as CreateAvailabilityRule;

  const listAvailabilityRules = {
    execute: listAvailabilityRulesExecute,
  } as unknown as ListAvailabilityRules;

  function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(createSchedulingAvailabilityRouter({ createAvailabilityRule, listAvailabilityRules }));
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    createAvailabilityRuleExecute.mockReset();
    listAvailabilityRulesExecute.mockReset();
  });

  describe("POST / — create availability rule", () => {
    const VALID_PAYLOAD = {
      weekday: 1,
      startTime: "09:00",
      endTime: "17:00",
      slotIntervalMinutes: 30,
    };

    it("returns 201 with created rule on valid payload", async () => {
      createAvailabilityRuleExecute.mockResolvedValue(SAMPLE_RULE_DTO);

      const response = await request(setupApp()).post("/").send(VALID_PAYLOAD);

      expect(response.status).toBe(201);
      expect(response.body.weekday).toBe(1);
      expect(response.body.startTime).toBe("09:00");
      expect(response.body.isActive).toBe(true);
    });

    it("calls createAvailabilityRule.execute() with businessId from auth token", async () => {
      createAvailabilityRuleExecute.mockResolvedValue(SAMPLE_RULE_DTO);

      await request(setupApp()).post("/").send(VALID_PAYLOAD);

      expect(createAvailabilityRuleExecute).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: BIZ_ID }),
      );
    });

    it("passes all payload fields to use case", async () => {
      createAvailabilityRuleExecute.mockResolvedValue(SAMPLE_RULE_DTO);

      await request(setupApp()).post("/").send(VALID_PAYLOAD);

      expect(createAvailabilityRuleExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          weekday: 1,
          startTime: "09:00",
          endTime: "17:00",
          slotIntervalMinutes: 30,
        }),
      );
    });

    it("returns 400 when weekday is out of range (> 6)", async () => {
      const response = await request(setupApp()).post("/").send({
        ...VALID_PAYLOAD,
        weekday: 7,
      });

      expect(response.status).toBe(400);
      expect(createAvailabilityRuleExecute).not.toHaveBeenCalled();
    });

    it("returns 400 when startTime format is invalid", async () => {
      const response = await request(setupApp()).post("/").send({
        ...VALID_PAYLOAD,
        startTime: "9am",
      });

      expect(response.status).toBe(400);
      expect(createAvailabilityRuleExecute).not.toHaveBeenCalled();
    });

    it("returns 400 when endTime format is invalid", async () => {
      const response = await request(setupApp()).post("/").send({
        ...VALID_PAYLOAD,
        endTime: "5:00pm",
      });

      expect(response.status).toBe(400);
      expect(createAvailabilityRuleExecute).not.toHaveBeenCalled();
    });

    it("returns 400 when slotIntervalMinutes is zero", async () => {
      const response = await request(setupApp()).post("/").send({
        ...VALID_PAYLOAD,
        slotIntervalMinutes: 0,
      });

      expect(response.status).toBe(400);
      expect(createAvailabilityRuleExecute).not.toHaveBeenCalled();
    });

    it("returns 400 when required fields are missing", async () => {
      const response = await request(setupApp()).post("/").send({});

      expect(response.status).toBe(400);
      expect(createAvailabilityRuleExecute).not.toHaveBeenCalled();
    });

    it("maps SCHEDULING_INVALID_AVAILABILITY_DATA to 400", async () => {
      createAvailabilityRuleExecute.mockRejectedValue(
        new SchedulingError("SCHEDULING_INVALID_AVAILABILITY_DATA", "invalid data"),
      );

      const response = await request(setupApp()).post("/").send(VALID_PAYLOAD);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SCHEDULING_INVALID_AVAILABILITY_DATA");
    });
  });

  describe("GET / — list availability rules", () => {
    it("returns 200 with array of rules", async () => {
      listAvailabilityRulesExecute.mockResolvedValue([SAMPLE_RULE_DTO]);

      const response = await request(setupApp()).get("/");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it("calls listAvailabilityRules.execute() with businessId from auth token", async () => {
      listAvailabilityRulesExecute.mockResolvedValue([]);

      await request(setupApp()).get("/");

      expect(listAvailabilityRulesExecute).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: BIZ_ID }),
      );
    });

    it("returns empty array when no rules exist", async () => {
      listAvailabilityRulesExecute.mockResolvedValue([]);

      const response = await request(setupApp()).get("/");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("maps SCHEDULING_AVAILABILITY_RULE_NOT_FOUND to 404", async () => {
      listAvailabilityRulesExecute.mockRejectedValue(
        new SchedulingError("SCHEDULING_AVAILABILITY_RULE_NOT_FOUND", "not found"),
      );

      const response = await request(setupApp()).get("/");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("SCHEDULING_AVAILABILITY_RULE_NOT_FOUND");
    });
  });
});
