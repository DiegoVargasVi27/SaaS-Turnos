import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCatalogServiceRouter } from "./CatalogServiceController";
import { CreateService } from "../../application/catalog/CreateService";
import { ListServices } from "../../application/catalog/ListServices";
import { UpdateService } from "../../application/catalog/UpdateService";
import { DeleteService } from "../../application/catalog/DeleteService";
import { CatalogError } from "../../application/catalog/CatalogError";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";

// Stub auth middleware to inject req.auth without JWT validation
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

const SAMPLE_SERVICE_DTO = new ServiceDTO(
  SVC_ID,
  BIZ_ID,
  "Haircut",
  30,
  2500,
  "USD",
  true,
  new Date().toISOString(),
);

describe("CatalogServiceController", () => {
  const createServiceExecute = vi.fn();
  const listServicesExecute = vi.fn();
  const updateServiceExecute = vi.fn();
  const deleteServiceExecute = vi.fn();

  const createService = { execute: createServiceExecute } as unknown as CreateService;
  const listServices = { execute: listServicesExecute } as unknown as ListServices;
  const updateService = { execute: updateServiceExecute } as unknown as UpdateService;
  const deleteService = { execute: deleteServiceExecute } as unknown as DeleteService;

  function setupApp() {
    const app = express();
    app.use(express.json());
    app.use(
      createCatalogServiceRouter({ createService, listServices, updateService, deleteService }),
    );
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    createServiceExecute.mockReset();
    listServicesExecute.mockReset();
    updateServiceExecute.mockReset();
    deleteServiceExecute.mockReset();
  });

  describe("POST / — create service", () => {
    it("returns 201 with created service on valid payload", async () => {
      createServiceExecute.mockResolvedValue(SAMPLE_SERVICE_DTO);

      const response = await request(setupApp()).post("/").send({
        name: "Haircut",
        durationMinutes: 30,
        priceCents: 2500,
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Haircut");
      expect(response.body.id).toBeDefined();
    });

    it("calls createService.execute() with businessId from auth token", async () => {
      createServiceExecute.mockResolvedValue(SAMPLE_SERVICE_DTO);

      await request(setupApp()).post("/").send({
        name: "Haircut",
        durationMinutes: 30,
        priceCents: 2500,
      });

      expect(createServiceExecute).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: BIZ_ID }),
      );
    });

    it("returns 400 when name is missing", async () => {
      const response = await request(setupApp()).post("/").send({
        durationMinutes: 30,
        priceCents: 2500,
      });

      expect(response.status).toBe(400);
      expect(createServiceExecute).not.toHaveBeenCalled();
    });

    it("returns 400 when name is too short (Zod validation)", async () => {
      const response = await request(setupApp()).post("/").send({
        name: "A",
        durationMinutes: 30,
        priceCents: 2500,
      });

      expect(response.status).toBe(400);
    });

    it("returns 400 when priceCents is negative (Zod validation)", async () => {
      const response = await request(setupApp()).post("/").send({
        name: "Haircut",
        durationMinutes: 30,
        priceCents: -100,
      });

      expect(response.status).toBe(400);
    });

    it("returns 409 when domain throws CATALOG_SERVICE_HAS_APPOINTMENTS", async () => {
      createServiceExecute.mockRejectedValue(
        new CatalogError("CATALOG_SERVICE_HAS_APPOINTMENTS", "has future appointments"),
      );

      const response = await request(setupApp()).post("/").send({
        name: "Haircut",
        durationMinutes: 30,
        priceCents: 2500,
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("CATALOG_SERVICE_HAS_APPOINTMENTS");
    });

    it("returns 404 when domain throws CATALOG_SERVICE_NOT_FOUND", async () => {
      createServiceExecute.mockRejectedValue(
        new CatalogError("CATALOG_SERVICE_NOT_FOUND", "not found"),
      );

      const response = await request(setupApp()).post("/").send({
        name: "Haircut",
        durationMinutes: 30,
        priceCents: 2500,
      });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("CATALOG_SERVICE_NOT_FOUND");
    });
  });

  describe("GET / — list services", () => {
    it("returns 200 with array of services", async () => {
      listServicesExecute.mockResolvedValue([SAMPLE_SERVICE_DTO]);

      const response = await request(setupApp()).get("/");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it("passes includeInactive=true when query param is 'true'", async () => {
      listServicesExecute.mockResolvedValue([]);

      await request(setupApp()).get("/").query({ includeInactive: "true" });

      expect(listServicesExecute).toHaveBeenCalledWith(
        expect.objectContaining({ includeInactive: true }),
      );
    });

    it("defaults to includeInactive=false when query param not provided", async () => {
      listServicesExecute.mockResolvedValue([]);

      await request(setupApp()).get("/");

      expect(listServicesExecute).toHaveBeenCalledWith(
        expect.objectContaining({ includeInactive: false }),
      );
    });
  });

  describe("PATCH /:id — update service", () => {
    it("returns 200 with updated service on valid payload", async () => {
      const updatedDTO = new ServiceDTO(SVC_ID, BIZ_ID, "Premium Haircut", 30, 2500, "USD", true, new Date().toISOString());
      updateServiceExecute.mockResolvedValue(updatedDTO);

      const response = await request(setupApp()).patch(`/${SVC_ID}`).send({ name: "Premium Haircut" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Premium Haircut");
    });

    it("returns 404 when service not found", async () => {
      updateServiceExecute.mockRejectedValue(
        new CatalogError("CATALOG_SERVICE_NOT_FOUND", "not found"),
      );

      const response = await request(setupApp()).patch(`/${SVC_ID}`).send({ name: "New Name" });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("CATALOG_SERVICE_NOT_FOUND");
    });

    it("returns 400 when name is too short (Zod validation)", async () => {
      const response = await request(setupApp()).patch(`/${SVC_ID}`).send({ name: "X" });

      expect(response.status).toBe(400);
      expect(updateServiceExecute).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id — soft-delete service", () => {
    it("returns 204 when service is successfully deleted", async () => {
      deleteServiceExecute.mockResolvedValue(undefined);

      const response = await request(setupApp()).delete(`/${SVC_ID}`);

      expect(response.status).toBe(204);
    });

    it("returns 409 when service has future appointments", async () => {
      deleteServiceExecute.mockRejectedValue(
        new CatalogError("CATALOG_SERVICE_HAS_APPOINTMENTS", "has future appointments"),
      );

      const response = await request(setupApp()).delete(`/${SVC_ID}`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("CATALOG_SERVICE_HAS_APPOINTMENTS");
    });

    it("returns 404 when service is not found", async () => {
      deleteServiceExecute.mockRejectedValue(
        new CatalogError("CATALOG_SERVICE_NOT_FOUND", "not found"),
      );

      const response = await request(setupApp()).delete(`/${SVC_ID}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("CATALOG_SERVICE_NOT_FOUND");
    });

    it("calls deleteService.execute() with serviceId and businessId", async () => {
      deleteServiceExecute.mockResolvedValue(undefined);

      await request(setupApp()).delete(`/${SVC_ID}`);

      expect(deleteServiceExecute).toHaveBeenCalledWith(
        expect.objectContaining({ serviceId: SVC_ID, businessId: BIZ_ID }),
      );
    });
  });
});
