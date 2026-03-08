import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { AppointmentStatus, Role } from "@prisma/client";
import { z } from "zod";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import {
  comparePassword,
  hashPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./lib/auth";
import { requireAuth } from "./middleware/auth";
import { buildSlots, overlaps } from "./lib/slots";

const registerSchema = z.object({
  businessName: z.string().min(2),
  businessSlug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const serviceSchema = z.object({
  name: z.string().min(2),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
});

const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  slotIntervalMin: z.number().int().positive().max(120).default(15),
});

const createAppointmentSchema = z.object({
  businessSlug: z.string().min(3),
  serviceId: z.string().uuid(),
  startsAt: z.coerce.date(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(7).optional(),
});

function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const existing = await prisma.business.findUnique({ where: { slug: input.businessSlug } });
  if (existing) {
    res.status(409).json({ message: "Business slug already exists" });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    res.status(409).json({ message: "Email already exists" });
    return;
  }

  const passwordHash = await hashPassword(input.password);

  const { user, business } = await prisma.$transaction(async (tx) => {
    const businessData = await tx.business.create({
      data: {
        name: input.businessName,
        slug: input.businessSlug,
      },
    });

    const userData = await tx.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
      },
    });

    await tx.businessUser.create({
      data: {
        businessId: businessData.id,
        userId: userData.id,
        role: Role.OWNER,
      },
    });

    return { user: userData, business: businessData };
  });

  const accessToken = signAccessToken({ sub: user.id, businessId: business.id, role: "OWNER" });
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    },
  });

  res.status(201).json({
    accessToken,
    refreshToken,
    business: { id: business.id, slug: business.slug, name: business.name },
    user: { id: user.id, email: user.email, fullName: user.fullName },
  });
});

app.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { businessLinks: true },
  });

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const primaryLink = user.businessLinks[0];
  if (!primaryLink) {
    res.status(403).json({ message: "User is not linked to a business" });
    return;
  }

  const accessToken = signAccessToken({
    sub: user.id,
    businessId: primaryLink.businessId,
    role: primaryLink.role,
  });
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ accessToken, refreshToken });
});

app.post("/auth/refresh", async (req, res) => {
  const token = req.body?.refreshToken as string | undefined;
  if (!token) {
    res.status(400).json({ message: "refreshToken is required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const tokenHash = hashToken(token);
    const tokenRow = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRow) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const businessLink = await prisma.businessUser.findFirst({ where: { userId: payload.sub } });
    if (!businessLink) {
      res.status(403).json({ message: "No business context found" });
      return;
    }

    const accessToken = signAccessToken({
      sub: payload.sub,
      businessId: businessLink.businessId,
      role: businessLink.role,
    });
    const refreshToken = signRefreshToken(payload.sub);

    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: tokenRow.id }, data: { revokedAt: new Date() } }),
      prisma.refreshToken.create({
        data: {
          userId: payload.sub,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    res.json({ accessToken, refreshToken });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

app.get("/services", requireAuth, async (req, res) => {
  const services = await prisma.service.findMany({
    where: { businessId: req.auth!.businessId },
    orderBy: { createdAt: "asc" },
  });
  res.json(services);
});

app.post("/services", requireAuth, async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const service = await prisma.service.create({
    data: {
      businessId: req.auth!.businessId,
      ...parsed.data,
    },
  });

  res.status(201).json(service);
});

app.get("/availability", requireAuth, async (req, res) => {
  const rules = await prisma.availabilityRule.findMany({
    where: { businessId: req.auth!.businessId },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  res.json(rules);
});

app.post("/availability", requireAuth, async (req, res) => {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  if (parsed.data.endTime <= parsed.data.startTime) {
    res.status(400).json({ message: "endTime must be after startTime" });
    return;
  }

  const rule = await prisma.availabilityRule.create({
    data: {
      businessId: req.auth!.businessId,
      ...parsed.data,
    },
  });

  res.status(201).json(rule);
});

app.get("/appointments", requireAuth, async (req, res) => {
  const rawDate = Array.isArray(req.query.date) ? req.query.date[0] : req.query.date;
  const rawStatus = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;

  let dateFilter:
    | {
        gte: Date;
        lte: Date;
      }
    | undefined;
  let statusFilter: AppointmentStatus | undefined;

  if (typeof rawDate !== "undefined") {
    const parsedDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(rawDate);
    if (!parsedDate.success) {
      res.status(400).json({ message: "Invalid date. Expected YYYY-MM-DD" });
      return;
    }

    const targetDate = new Date(`${parsedDate.data}T00:00:00.000Z`);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    dateFilter = { gte: startOfDay, lte: endOfDay };
  }

  if (typeof rawStatus !== "undefined") {
    const parsedStatus = z.nativeEnum(AppointmentStatus).safeParse(rawStatus);
    if (!parsedStatus.success) {
      res.status(400).json({ message: "Invalid status filter" });
      return;
    }

    statusFilter = parsedStatus.data;
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: req.auth!.businessId,
      ...(dateFilter ? { startsAt: dateFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          durationMin: true,
        },
      },
      clientUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  res.json({ appointments });
});

app.get("/appointments/slots", async (req, res) => {
  const businessSlug = z.string().min(3).safeParse(req.query.businessSlug);
  const serviceId = z.string().uuid().safeParse(req.query.serviceId);
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(req.query.date);

  if (!businessSlug.success || !serviceId.success || !date.success) {
    res.status(400).json({ message: "businessSlug, serviceId and date are required" });
    return;
  }

  const business = await prisma.business.findUnique({ where: { slug: businessSlug.data } });
  if (!business) {
    res.status(404).json({ message: "Business not found" });
    return;
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId.data, businessId: business.id, isActive: true },
  });
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }

  const targetDate = new Date(`${date.data}T00:00:00.000Z`);
  const weekday = targetDate.getUTCDay();

  const rules = await prisma.availabilityRule.findMany({
    where: {
      businessId: business.id,
      weekday,
      isActive: true,
    },
  });

  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots = rules.flatMap((rule) =>
    buildSlots(
      {
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotIntervalMin: rule.slotIntervalMin,
      },
      targetDate,
      service.durationMin,
    ),
  );

  const availableSlots = slots.filter((slotStart) => {
    if (slotStart <= new Date()) {
      return false;
    }

    const slotEnd = new Date(slotStart.getTime() + service.durationMin * 60_000);
    return !appointments.some((appointment) =>
      overlaps(slotStart, slotEnd, appointment.startsAt, appointment.endsAt),
    );
  });

  res.json({ slots: availableSlots.map((item) => item.toISOString()) });
});

app.post("/appointments", async (req, res) => {
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload", issues: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const business = await prisma.business.findUnique({ where: { slug: input.businessSlug } });
  if (!business) {
    res.status(404).json({ message: "Business not found" });
    return;
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, businessId: business.id, isActive: true },
  });
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }

  const startsAt = input.startsAt;
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

  if (startsAt <= new Date()) {
    res.status(400).json({ message: "Appointment must be in the future" });
    return;
  }

  if (startsAt.toISOString().slice(0, 10) !== endsAt.toISOString().slice(0, 10)) {
    res.status(400).json({ message: "Appointment cannot cross day boundaries" });
    return;
  }

  const weekday = startsAt.getUTCDay();
  const rules = await prisma.availabilityRule.findMany({
    where: {
      businessId: business.id,
      weekday,
      isActive: true,
    },
  });

  const startsAtMinutes = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
  const endsAtMinutes = endsAt.getUTCHours() * 60 + endsAt.getUTCMinutes();
  const insideAvailability = rules.some((rule) => {
    const ruleStart = hhmmToMinutes(rule.startTime);
    const ruleEnd = hhmmToMinutes(rule.endTime);

    if (startsAtMinutes < ruleStart || endsAtMinutes > ruleEnd) {
      return false;
    }

    return (startsAtMinutes - ruleStart) % rule.slotIntervalMin === 0;
  });

  if (!insideAvailability) {
    res.status(409).json({ message: "Selected slot is outside business availability" });
    return;
  }

  const overlapping = await prisma.appointment.findFirst({
    where: {
      businessId: business.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  if (overlapping) {
    res.status(409).json({ message: "Selected slot is not available" });
    return;
  }

  const fallbackPassword = await hashPassword(`client-${Date.now()}-${Math.random()}`);
  const client = await prisma.user.upsert({
    where: { email: input.clientEmail },
    update: {
      fullName: input.clientName,
      phone: input.clientPhone,
    },
    create: {
      email: input.clientEmail,
      fullName: input.clientName,
      phone: input.clientPhone,
      passwordHash: fallbackPassword,
    },
  });

  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: client.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: client.id,
      role: Role.CLIENT,
    },
  });

  const appointment = await prisma.appointment.create({
    data: {
      businessId: business.id,
      serviceId: service.id,
      clientUserId: client.id,
      startsAt,
      endsAt,
      status: "CONFIRMED",
    },
    include: { service: true },
  });

  res.status(201).json(appointment);
});

app.patch("/appointments/:id/cancel", requireAuth, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ message: "Invalid appointment id" });
    return;
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: id.data, businessId: req.auth!.businessId },
  });

  if (!appointment) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }

  const updated = await prisma.appointment.update({
    where: { id: id.data },
    data: { status: "CANCELLED" },
  });

  res.json(updated);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

export { app };
