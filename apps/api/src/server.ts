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

// Scheduling bounded context
app.use("/api/appointments/slots", createSlotsRouter());
app.use("/api/appointments", createAppointmentRouter());

// Auth bounded context
app.use("/auth", createAuthRouter());

// Availability bounded context
app.use("/api/availability", createAvailabilityRouter());

// Public endpoints
app.use("/public", createPublicRouter());

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
