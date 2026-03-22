import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchedulingSlotsRouter } from "./SlotsController";
import { GetServiceAvailability } from "../../application/catalog/GetServiceAvailability";
import { CatalogError } from "../../application/catalog/CatalogError";

describe("SchedulingSlotsController", () => {
  const getServiceAvailabilityExecute = vi.fn();
  const getServiceAvailability = {
    execute: getServiceAvailabilityExecute,
  } as unknown as GetServiceAvailability;

  function setupApp() {
    const app = express();
    app.use(createSchedulingSlotsRouter({ getServiceAvailability }));
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getServiceAvailabilityExecute.mockReset();
  });

  it("returns slots for valid query", async () => {
    getServiceAvailabilityExecute.mockResolvedValue({
      business: { id: "biz", slug: "demo", name: "Demo" },
      service: { id: "svc", name: "Cut", durationMin: 30 },
      slots: [],
    });

    const response = await request(setupApp())
      .get("/")
      .query({ businessSlug: "demo", serviceId: "c8d0a748-5f8c-4a8f-95c7-5e73c6f5c111", date: "2026-03-20" });

    expect(response.status).toBe(200);
    expect(getServiceAvailabilityExecute).toHaveBeenCalled();
  });

  it("maps catalog errors", async () => {
    getServiceAvailabilityExecute.mockRejectedValue(
      new CatalogError("CATALOG_SERVICE_NOT_FOUND", "missing"),
    );

    const response = await request(setupApp())
      .get("/")
      .query({ businessSlug: "demo", serviceId: "c8d0a748-5f8c-4a8f-95c7-5e73c6f5c111", date: "2026-03-20" });

    expect(response.status).toBe(404);
  });

  it("validates query params", async () => {
    const response = await request(setupApp()).get("/").query({ businessSlug: "demo" });
    expect(response.status).toBe(400);
  });
});
