import express from "express";
import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createCatalogPublicRouter } from "./CatalogPublicController";
import { CatalogError } from "../../application/catalog/CatalogError";
import { ListCatalogServices } from "../../application/catalog/ListCatalogServices";

describe("CatalogPublicController", () => {
  const listCatalogServicesExecute = vi.fn();
  const listCatalogServices = { execute: listCatalogServicesExecute } as unknown as ListCatalogServices;

  function setupApp() {
    const app = express();
    app.use(createCatalogPublicRouter({ listCatalogServices }));
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    listCatalogServicesExecute.mockReset();
  });

  it("returns services for a valid business", async () => {
    listCatalogServicesExecute.mockResolvedValue({
      business: { id: "biz", slug: "demo", name: "Demo" },
      services: [],
    });
    const app = setupApp();

    const response = await request(app)
      .get("/services")
      .query({ businessSlug: "demo" });

    expect(response.status).toBe(200);
    expect(listCatalogServicesExecute).toHaveBeenCalledWith({
      businessSlug: "demo",
      includeAvailability: false,
      date: undefined,
      slotsPerService: undefined,
    });
  });

  it("maps catalog errors to 404", async () => {
    listCatalogServicesExecute.mockRejectedValue(
      new CatalogError("CATALOG_BUSINESS_NOT_FOUND", "not found"),
    );
    const app = setupApp();

    const response = await request(app)
      .get("/services")
      .query({ businessSlug: "missing" });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("CATALOG_BUSINESS_NOT_FOUND");
  });

  it("validates query parameters", async () => {
    const app = setupApp();

    const response = await request(app).get("/services").query({});

    expect(response.status).toBe(400);
  });
});
