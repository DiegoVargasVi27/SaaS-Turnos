import { Appointment } from "../entities/appointment/Appointment";
import { AppointmentId } from "../../shared/types/AppointmentId";
import { BusinessId } from "../../shared/types/BusinessId";
import { ServiceId } from "../../shared/types/ServiceId";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";

/**
 * Repository interface for Appointment aggregate.
 * Defines persistence operations following Repository pattern.
 */
export interface IAppointmentRepository {
  /**
   * Find an appointment by ID.
   */
  findById(id: AppointmentId): Promise<Appointment | null>;

  /**
   * Find active appointments (PENDING, CONFIRMED) for a business on a specific date range.
   * Used for overlap checking when booking new appointments.
   */
  findActiveByBusinessAndDateRange(
    businessId: BusinessId,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]>;

  /**
   * Find appointments for a business with optional filters.
   */
  findByBusiness(
    businessId: BusinessId,
    filters?: {
      date?: Date; // Specific date (searches entire day)
      status?: PrismaStatus;
      serviceId?: ServiceId;
    }
  ): Promise<Appointment[]>;

  /**
   * Check if there are future appointments for a service.
   * Used to prevent deleting services with scheduled appointments.
   */
  hasFutureAppointments(serviceId: ServiceId): Promise<boolean>;

  /**
   * Save a new or updated appointment.
   */
  save(appointment: Appointment): Promise<void>;

  /**
   * Delete an appointment (rarely used - prefer cancellation).
   */
  delete(id: AppointmentId): Promise<void>;
}
