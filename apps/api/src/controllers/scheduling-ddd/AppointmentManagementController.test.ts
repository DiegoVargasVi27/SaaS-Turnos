import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchedulingAppointmentManagementRouter } from "./AppointmentManagementController";
import { ListAppointments } from "../../application/scheduling/ListAppointments";
import { CancelAppointment } from "../../application/scheduling/CancelAppointment";
import { SchedulingError } from "../../application/scheduling/SchedulingError";
import { InvalidStatusTransitionException } from "../../domain/scheduling/exceptions/InvalidStatusTransitionException";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";

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
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";
const APT_ID = "11dfe52f-2dce-4dc5-8561-0df4d9d33c07";
const CLIENT_ID = "510a9af0-0be2-4764-9fe3-3b9454f3c9b8";

const SAMPLE_APT_DTO = new AppointmentDTO(
  APT_ID,
  BIZ_ID,
  SVC_ID,
  CLIENT_ID,
  new Date().toISOString(),
  new Date().toISOString(),
  "PENDING",
  new Date().toISOString(),
);

const CANCELLED_APT_DTO = new AppointmentDTO(
  APT_ID,
  BIZ_ID,
  SVC_ID,
  CLIENT_ID,
  new Date().toISOString(),
  new Date().toISOString(),
  "CANCELLED",
  new Date().toISOString(),
);

describe("AppointmentManagementController", () => {
  const listAppointmentsExecute = vi.fn();
  const cancelAppointmentExecute = vi.fn();

  const listAppointments = { execute: listAppointmentsExecute } as unknown as ListAppointments;
  const cancelAppointment = { execute: cancelAppointmentExecute } as unknown as CancelAppointment;

  function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(createSchedulingAppointmentManagementRouter({ listAppointments, cancelAppointment }));
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    listAppointmentsExecute.mockReset();
    cancelAppointmentExecute.mockReset();
  });

  describe("GET / — list appointments", () => {
    it("returns 200 with appointments array", async () => {
      listAppointmentsExecute.mockResolvedValue([SAMPLE_APT_DTO]);

      const response = await request(setupApp()).get("/").query({ businessId: BIZ_ID });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it("passes businessId from auth token to use case", async () => {
      listAppointmentsExecute.mockResolvedValue([]);

      await request(setupApp()).get("/");

      expect(listAppointmentsExecute).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: BIZ_ID }),
      );
    });

    it("passes optional date filter to use case", async () => {
      listAppointmentsExecute.mockResolvedValue([]);

      await request(setupApp()).get("/").query({ date: "2026-03-21" });

      expect(listAppointmentsExecute).toHaveBeenCalledWith(
        expect.objectContaining({ date: "2026-03-21" }),
      );
    });

    it("passes optional status filter to use case", async () => {
      listAppointmentsExecute.mockResolvedValue([]);

      await request(setupApp()).get("/").query({ status: "PENDING" });

      expect(listAppointmentsExecute).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PENDING" }),
      );
    });

    it("passes optional serviceId filter to use case", async () => {
      listAppointmentsExecute.mockResolvedValue([]);

      await request(setupApp()).get("/").query({ serviceId: SVC_ID });

      expect(listAppointmentsExecute).toHaveBeenCalledWith(
        expect.objectContaining({ serviceId: SVC_ID }),
      );
    });

    it("returns 400 when date format is invalid", async () => {
      const response = await request(setupApp()).get("/").query({ date: "not-a-date" });

      expect(response.status).toBe(400);
      expect(listAppointmentsExecute).not.toHaveBeenCalled();
    });

    it("returns 400 when serviceId is not a valid UUID", async () => {
      const response = await request(setupApp()).get("/").query({ serviceId: "not-a-uuid" });

      expect(response.status).toBe(400);
      expect(listAppointmentsExecute).not.toHaveBeenCalled();
    });

    it("maps SCHEDULING_APPOINTMENT_NOT_FOUND to 404", async () => {
      listAppointmentsExecute.mockRejectedValue(
        new SchedulingError("SCHEDULING_APPOINTMENT_NOT_FOUND", "not found"),
      );

      const response = await request(setupApp()).get("/");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("SCHEDULING_APPOINTMENT_NOT_FOUND");
    });
  });

  describe("POST /:id/cancel — cancel appointment", () => {
    it("returns 200 with cancelled appointment", async () => {
      cancelAppointmentExecute.mockResolvedValue(CANCELLED_APT_DTO);

      const response = await request(setupApp()).post(`/${APT_ID}/cancel`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("CANCELLED");
    });

    it("calls cancelAppointment.execute() with appointmentId from URL", async () => {
      cancelAppointmentExecute.mockResolvedValue(CANCELLED_APT_DTO);

      await request(setupApp()).post(`/${APT_ID}/cancel`);

      expect(cancelAppointmentExecute).toHaveBeenCalledWith(
        expect.objectContaining({ appointmentId: APT_ID }),
      );
    });

    it("returns 404 when appointment is not found", async () => {
      cancelAppointmentExecute.mockRejectedValue(
        new SchedulingError("SCHEDULING_APPOINTMENT_NOT_FOUND", "not found"),
      );

      const response = await request(setupApp()).post(`/${APT_ID}/cancel`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("SCHEDULING_APPOINTMENT_NOT_FOUND");
    });

    it("returns 409 when appointment is in a terminal state (InvalidStatusTransitionException)", async () => {
      cancelAppointmentExecute.mockRejectedValue(
        new InvalidStatusTransitionException("COMPLETED", "CANCELLED"),
      );

      const response = await request(setupApp()).post(`/${APT_ID}/cancel`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("returns 409 when SchedulingError with SCHEDULING_APPOINTMENT_NOT_CANCELLABLE", async () => {
      cancelAppointmentExecute.mockRejectedValue(
        new SchedulingError("SCHEDULING_APPOINTMENT_NOT_CANCELLABLE", "cannot cancel"),
      );

      const response = await request(setupApp()).post(`/${APT_ID}/cancel`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("SCHEDULING_APPOINTMENT_NOT_CANCELLABLE");
    });
  });
});
