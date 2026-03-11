import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

function setRequiredEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
}

async function loadApp() {
  setRequiredEnv();
  vi.resetModules();
  const serverModule = await import("./server");
  return serverModule.app;
}

describe("Server Routes - Smoke Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Health Check", () => {
    it("GET /health returns 200", async () => {
      const app = await loadApp();
      const response = await request(app).get("/health");
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("API Routes Registration", () => {
    it("POST /api/appointments route exists", async () => {
      const app = await loadApp();
      const response = await request(app)
        .post("/api/appointments")
        .send({});
      
      // Should not be 404 (route exists)
      // Will be 400 (validation error) or 422/500 (business logic)
      expect(response.status).not.toBe(404);
    });

    it("GET /api/appointments/slots route exists", async () => {
      const app = await loadApp();
      const response = await request(app)
        .get("/api/appointments/slots")
        .query({});
      
      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it("POST /auth/login route exists", async () => {
      const app = await loadApp();
      const response = await request(app)
        .post("/auth/login")
        .send({});
      
      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it("POST /auth/register route exists", async () => {
      const app = await loadApp();
      const response = await request(app)
        .post("/auth/register")
        .send({});
      
      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it("GET /public/services route exists", async () => {
      const app = await loadApp();
      const response = await request(app)
        .get("/public/services")
        .query({});
      
      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it("GET /api/services route exists and requires auth", async () => {
      const app = await loadApp();
      const response = await request(app).get("/api/services");
      
      // Should be 401 (unauthorized) not 404
      expect(response.status).toBe(401);
    });

    it("GET /api/availability route exists and requires auth", async () => {
      const app = await loadApp();
      const response = await request(app).get("/api/availability");
      
      // Should be 401 (unauthorized) not 404
      expect(response.status).toBe(401);
    });
  });
});
