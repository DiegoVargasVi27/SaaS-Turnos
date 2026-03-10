import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

type PrismaMock = {
  business: { findUnique: ReturnType<typeof vi.fn> };
  service: { findFirst: ReturnType<typeof vi.fn> };
  availabilityRule: { findMany: ReturnType<typeof vi.fn> };
  appointment: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  user: { upsert: ReturnType<typeof vi.fn> };
  businessUser: { upsert: ReturnType<typeof vi.fn> };
  refreshToken: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function setRequiredEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
}

function createPrismaMock(): PrismaMock {
  const mock: PrismaMock = {
    business: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    appointment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: { upsert: vi.fn() },
    businessUser: { upsert: vi.fn() },
    refreshToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // By default, $transaction executes the callback with the mock itself as tx
  mock.$transaction.mockImplementation((fn: unknown) => {
    if (typeof fn === "function") return fn(mock);
    return Promise.resolve(fn);
  });
  return mock;
}

async function loadApp(prismaMock: PrismaMock) {
  setRequiredEnv();
  vi.resetModules();
  vi.doMock("./lib/prisma", () => ({ prisma: prismaMock }));
  const serverModule = await import("./server");
  return serverModule.app;
}

function authHeader(businessId = "business-1"): { Authorization: string } {
  const token = jwt.sign(
    { sub: "user-1", businessId, role: "OWNER" },
    "test-access-secret",
    { expiresIn: "15m" },
  );

  return { Authorization: `Bearer ${token}` };
}

describe("POST /appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when payload is invalid", async () => {
    const prismaMock = createPrismaMock();
    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "invalid-uuid",
      startsAt: "2030-01-07T10:00:00.000Z",
      clientName: "C",
      clientEmail: "invalid-email",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        code: "INVALID_PAYLOAD",
        message: "Invalid payload",
      }),
    );
  });

  it("returns 404 when business does not exist", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue(null);

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T10:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Business not found",
      code: "BUSINESS_NOT_FOUND",
    });
  });

  it("returns 404 when service does not exist", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue(null);

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T10:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Service not found",
      code: "SERVICE_NOT_FOUND",
    });
  });

  it("returns 400 when appointment is in the past", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 30,
      isActive: true,
    });

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2000-01-07T10:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Appointment must be in the future",
      code: "APPOINTMENT_IN_PAST",
    });
  });

  it("returns 400 when appointment crosses day boundaries", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 120,
      isActive: true,
    });

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T23:30:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Appointment cannot cross day boundaries",
      code: "APPOINTMENT_CROSSES_DAY",
    });
  });

  it("returns 409 when selected slot is outside availability", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 30,
      isActive: true,
    });
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        weekday: 1,
        startTime: "09:00",
        endTime: "18:00",
        slotIntervalMin: 30,
        isActive: true,
      },
    ]);

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T08:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Selected slot is outside business availability",
      code: "SLOT_OUTSIDE_AVAILABILITY",
    });
  });

  it("returns 409 when slot overlaps an existing appointment", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 30,
      isActive: true,
    });
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        weekday: 1,
        startTime: "09:00",
        endTime: "18:00",
        slotIntervalMin: 30,
        isActive: true,
      },
    ]);
    prismaMock.appointment.findFirst.mockResolvedValue({
      id: "appointment-1",
      startsAt: new Date("2030-01-07T10:00:00.000Z"),
      endsAt: new Date("2030-01-07T10:30:00.000Z"),
      status: "CONFIRMED",
    });

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T10:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Selected slot is not available",
      code: "SLOT_NOT_AVAILABLE",
    });
  });

  it("returns 201 when appointment is created successfully", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 30,
      isActive: true,
    });
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        weekday: 1,
        startTime: "09:00",
        endTime: "18:00",
        slotIntervalMin: 30,
        isActive: true,
      },
    ]);
    prismaMock.appointment.findFirst.mockResolvedValue(null);
    prismaMock.user.upsert.mockResolvedValue({ id: "client-1" });
    prismaMock.businessUser.upsert.mockResolvedValue({ id: "business-user-1" });
    prismaMock.appointment.create.mockResolvedValue({
      id: "appointment-1",
      status: "CONFIRMED",
      startsAt: new Date("2030-01-07T10:00:00.000Z"),
      endsAt: new Date("2030-01-07T10:30:00.000Z"),
      service: { id: "service-1", name: "Corte" },
    });

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T10:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe("appointment-1");
    expect(response.body.status).toBe("CONFIRMED");
    expect(prismaMock.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: "business-1",
          serviceId: "service-1",
          clientUserId: "client-1",
          status: "CONFIRMED",
        }),
      }),
    );
  });

  it("returns 500 when an unexpected error happens", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 30,
      isActive: true,
    });
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        weekday: 1,
        startTime: "09:00",
        endTime: "18:00",
        slotIntervalMin: 30,
        isActive: true,
      },
    ]);
    prismaMock.appointment.findFirst.mockResolvedValue(null);
    prismaMock.user.upsert.mockResolvedValue({ id: "client-1" });
    prismaMock.businessUser.upsert.mockResolvedValue({ id: "business-user-1" });
    prismaMock.appointment.create.mockRejectedValue(new Error("db down"));

    const app = await loadApp(prismaMock);

    const response = await request(app).post("/appointments").send({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      startsAt: "2030-01-07T10:00:00.000Z",
      clientName: "Cliente Demo",
      clientEmail: "cliente@demo.com",
      clientPhone: "123456789",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("GET /appointments/slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when query params are invalid", async () => {
    const prismaMock = createPrismaMock();
    const app = await loadApp(prismaMock);

    const response = await request(app).get("/appointments/slots").query({
      businessSlug: "de",
      serviceId: "invalid-uuid",
      date: "07-01-2030",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "businessSlug, serviceId and date are required",
      code: "INVALID_OR_MISSING_QUERY",
    });
  });

  it("returns 404 when business does not exist", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue(null);
    const app = await loadApp(prismaMock);

    const response = await request(app).get("/appointments/slots").query({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      date: "2030-01-07",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Business not found",
      code: "BUSINESS_NOT_FOUND",
    });
  });

  it("returns 404 when service does not exist", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue(null);
    const app = await loadApp(prismaMock);

    const response = await request(app).get("/appointments/slots").query({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      date: "2030-01-07",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Service not found",
      code: "SERVICE_NOT_FOUND",
    });
  });

  it("returns 500 when an unexpected error happens", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const prismaMock = createPrismaMock();
    prismaMock.business.findUnique.mockResolvedValue({ id: "business-1", slug: "demo-barberia" });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-1",
      businessId: "business-1",
      durationMin: 30,
      isActive: true,
    });
    prismaMock.availabilityRule.findMany.mockRejectedValue(new Error("db down"));
    const app = await loadApp(prismaMock);

    const response = await request(app).get("/appointments/slots").query({
      businessSlug: "demo-barberia",
      serviceId: "11111111-1111-1111-1111-111111111111",
      date: "2030-01-07",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("GET /appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when date filter is invalid", async () => {
    const prismaMock = createPrismaMock();
    const app = await loadApp(prismaMock);

    const response = await request(app)
      .get("/appointments")
      .set(authHeader())
      .query({ date: "07-01-2030" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Invalid date. Expected YYYY-MM-DD",
      code: "INVALID_DATE_FILTER",
    });
  });

  it("returns 400 when status filter is invalid", async () => {
    const prismaMock = createPrismaMock();
    const app = await loadApp(prismaMock);

    const response = await request(app)
      .get("/appointments")
      .set(authHeader())
      .query({ status: "INVALID" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Invalid status filter",
      code: "INVALID_STATUS_FILTER",
    });
  });

  it("returns 200 with filtered appointments", async () => {
    const prismaMock = createPrismaMock();
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: "appointment-1",
        businessId: "business-1",
        status: "CONFIRMED",
        startsAt: new Date("2030-01-07T10:00:00.000Z"),
        endsAt: new Date("2030-01-07T10:30:00.000Z"),
      },
    ]);
    const app = await loadApp(prismaMock);

    const response = await request(app)
      .get("/appointments")
      .set(authHeader("business-1"))
      .query({ date: "2030-01-07", status: "CONFIRMED" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      appointments: [
        expect.objectContaining({
          id: "appointment-1",
          businessId: "business-1",
          status: "CONFIRMED",
        }),
      ],
    });
    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "business-1",
          startsAt: {
            gte: new Date("2030-01-07T00:00:00.000Z"),
            lte: new Date("2030-01-07T23:59:59.999Z"),
          },
          status: "CONFIRMED",
        },
      }),
    );
  });

  it("returns 500 when an unexpected error happens", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const prismaMock = createPrismaMock();
    prismaMock.appointment.findMany.mockRejectedValue(new Error("db down"));
    const app = await loadApp(prismaMock);

    const response = await request(app)
      .get("/appointments")
      .set(authHeader())
      .query({ date: "2030-01-07", status: "CONFIRMED" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
