import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import {
  createServiceRouter,
  createSlotsRouter,
  createAppointmentRouter,
  createAuthRouter,
  createAvailabilityRouter,
  createPublicRouter,
} from "./controllers";
import { buildCatalogSchedulingModule, buildIdentityModule } from "./composition";
import { prisma } from "./lib/prisma";
import { sendError } from "./lib/http";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(morgan("dev"));
app.use(express.json());

// ============================================================================
// Route Controllers
// ============================================================================

// Catalog bounded context
app.use("/api/services", createServiceRouter());

if (config.enableCatalogDDD) {
  const catalogScheduling = buildCatalogSchedulingModule({ prisma });
  app.use("/public", catalogScheduling.publicRouter);
  app.use("/api/appointments/slots", catalogScheduling.slotsRouter);
  app.use("/api/appointments", catalogScheduling.appointmentRouter);

  // Admin DDD routes (auth required — handled by controllers)
  app.use("/api/services", catalogScheduling.serviceRouter);
  app.use("/api/availability", catalogScheduling.availabilityRouter);
  app.use("/api/admin/appointments", catalogScheduling.appointmentManagementRouter);
} else {
  // Legacy public + scheduling routers
  app.use("/public", createPublicRouter());
  app.use("/api/appointments/slots", createSlotsRouter());
  app.use("/api/appointments", createAppointmentRouter());
}

if (config.enableIdentityDDD) {
  const identityModule = buildIdentityModule({ prisma, refreshTokenTtlDays: config.refreshTokenTtlDays });
  app.use("/api/identity", identityModule.router);
  app.use("/auth", identityModule.router);
} else {
  app.use("/auth", createAuthRouter());
}

// Availability bounded context
app.use("/api/availability", createAvailabilityRouter());


// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  sendError(res, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

export { app };
