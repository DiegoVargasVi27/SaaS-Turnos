import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type PrismaMock = {
  business: { findUnique: ReturnType<typeof vi.fn> };
  service: { findFirst: ReturnType<typeof vi.fn> };
  availabilityRule: { findMany: ReturnType<typeof vi.fn> };
  appointment: {
    findFirst: ReturnType<typeof vi.fn>;
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
  return {
    business: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    appointment: {
      findFirst: vi.fn(),
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
}

async function loadApp(prismaMock: PrismaMock) {
  setRequiredEnv();
  vi.resetModules();
  vi.doMock("./lib/prisma", () => ({ prisma: prismaMock }));
  const serverModule = await import("./server");
  return serverModule.app;
}

describe("POST /appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(response.body).toEqual({ message: "Selected slot is outside business availability" });
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
    expect(response.body).toEqual({ message: "Selected slot is not available" });
  });
});
