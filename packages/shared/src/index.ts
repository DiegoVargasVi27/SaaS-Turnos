import { z } from "zod";

export const registerSchema = z.object({
  businessName: z.string().min(2),
  businessSlug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const serviceSchema = z.object({
  name: z.string().min(2),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
});

export const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  slotIntervalMin: z.number().int().positive().max(120).default(15),
});

export const createAppointmentSchema = z.object({
  businessSlug: z.string().min(3),
  serviceId: z.string().uuid(),
  startsAt: z.coerce.date(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(7).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
