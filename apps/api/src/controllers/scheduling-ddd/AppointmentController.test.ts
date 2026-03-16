import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchedulingAppointmentRouter } from "./AppointmentController";
import { BookAppointment } from "../../application/scheduling/BookAppointment";
import { SchedulingError } from "../../application/scheduling/SchedulingError";

describe("SchedulingAppointmentController", () => {
  const bookAppointmentExecute = vi.fn();
  const bookAppointment = { execute: bookAppointmentExecute } as unknown as BookAppointment;

  function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(createSchedulingAppointmentRouter({ bookAppointment }));
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    bookAppointmentExecute.mockReset();
  });

  it("creates appointment and returns 201", async () => {
    bookAppointmentExecute.mockResolvedValue({ id: "apt" });

    const response = await request(setupApp())
      .post("/")
      .send({
        businessSlug: "demo",
        serviceId: "c8d0a748-5f8c-4a8f-95c7-5e73c6f5c111",
        startsAt: new Date().toISOString(),
        clientEmail: "foo@bar.com",
        clientName: "Foo",
      });

    expect(response.status).toBe(201);
  });

  it("maps scheduling conflicts to 409", async () => {
    bookAppointmentExecute.mockRejectedValue(
      new SchedulingError("SCHEDULING_SLOT_TAKEN", "conflict"),
    );

    const response = await request(setupApp())
      .post("/")
      .send({
        businessSlug: "demo",
        serviceId: "c8d0a748-5f8c-4a8f-95c7-5e73c6f5c111",
        startsAt: new Date().toISOString(),
        clientEmail: "foo@bar.com",
        clientName: "Foo",
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SCHEDULING_SLOT_TAKEN");
  });

  it("validates payload", async () => {
    const response = await request(setupApp()).post("/").send({});
    expect(response.status).toBe(400);
  });
});
