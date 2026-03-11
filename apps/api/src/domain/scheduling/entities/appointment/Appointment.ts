import { Entity } from "../../../shared/interfaces/Entity";
import { AppointmentId } from "../../../shared/types/AppointmentId";
import { BusinessId } from "../../../shared/types/BusinessId";
import { ServiceId } from "../../../shared/types/ServiceId";
import { UserId } from "../../../shared/types/UserId";
import { TimeSlot } from "./TimeSlot";
import { AppointmentStatus } from "./AppointmentStatus";
import { InvalidStatusTransitionException } from "../../exceptions/InvalidStatusTransitionException";
import { PastAppointmentException } from "../../exceptions/PastAppointmentException";

/**
 * Appointment aggregate root.
 * Represents a scheduled appointment between a client and a business for a specific service.
 * 
 * Business rules:
 * - Appointments must be in the future (at creation)
 * - Cannot cross day boundaries
 * - Must respect status transition rules
 * - Active appointments (PENDING, CONFIRMED) block time slots
 */
export class Appointment implements Entity {
  private constructor(
    private readonly _id: AppointmentId,
    private readonly _businessId: BusinessId,
    private readonly _serviceId: ServiceId,
    private readonly _clientUserId: UserId,
    private readonly _timeSlot: TimeSlot,
    private _status: AppointmentStatus,
    private readonly _createdAt: Date
  ) {}

  /**
   * Create a new Appointment (for booking).
   * Validates that the appointment is in the future.
   */
  static create(
    businessId: BusinessId,
    serviceId: ServiceId,
    clientUserId: UserId,
    timeSlot: TimeSlot,
    id?: AppointmentId
  ): Appointment {
    // Business rule: appointments must be in the future
    if (!timeSlot.isInFuture()) {
      throw new PastAppointmentException();
    }

    const appointmentId = id ?? AppointmentId.create();
    const status = AppointmentStatus.confirmed(); // Default to CONFIRMED
    const createdAt = new Date();

    return new Appointment(
      appointmentId,
      businessId,
      serviceId,
      clientUserId,
      timeSlot,
      status,
      createdAt
    );
  }

  /**
   * Reconstitute from persistence (for existing appointments).
   */
  static reconstitute(
    id: AppointmentId,
    businessId: BusinessId,
    serviceId: ServiceId,
    clientUserId: UserId,
    timeSlot: TimeSlot,
    status: AppointmentStatus,
    createdAt: Date
  ): Appointment {
    return new Appointment(
      id,
      businessId,
      serviceId,
      clientUserId,
      timeSlot,
      status,
      createdAt
    );
  }

  // Getters
  get id(): AppointmentId {
    return this._id;
  }

  get businessId(): BusinessId {
    return this._businessId;
  }

  get serviceId(): ServiceId {
    return this._serviceId;
  }

  get clientUserId(): UserId {
    return this._clientUserId;
  }

  get timeSlot(): TimeSlot {
    return this._timeSlot;
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // Business methods

  /**
   * Cancel this appointment.
   * Business rule: can only cancel PENDING or CONFIRMED appointments.
   */
  cancel(): void {
    if (!this._status.canBeCancelled()) {
      throw new InvalidStatusTransitionException(
        this._status.value,
        "CANCELLED"
      );
    }
    this._status = AppointmentStatus.cancelled();
  }

  /**
   * Mark appointment as completed.
   * Business rule: can only complete CONFIRMED appointments.
   */
  complete(): void {
    if (!this._status.canTransitionTo("COMPLETED")) {
      throw new InvalidStatusTransitionException(
        this._status.value,
        "COMPLETED"
      );
    }
    this._status = AppointmentStatus.completed();
  }

  /**
   * Mark appointment as no-show.
   * Business rule: can only mark CONFIRMED appointments as no-show.
   */
  markAsNoShow(): void {
    if (!this._status.canTransitionTo("NO_SHOW")) {
      throw new InvalidStatusTransitionException(
        this._status.value,
        "NO_SHOW"
      );
    }
    this._status = AppointmentStatus.noShow();
  }

  /**
   * Confirm a pending appointment.
   * Business rule: can only confirm PENDING appointments.
   */
  confirm(): void {
    if (!this._status.canTransitionTo("CONFIRMED")) {
      throw new InvalidStatusTransitionException(
        this._status.value,
        "CONFIRMED"
      );
    }
    this._status = AppointmentStatus.confirmed();
  }

  /**
   * Check if this appointment overlaps with another.
   */
  overlapsWith(other: Appointment): boolean {
    // Only active appointments block slots
    if (!this._status.isActive() || !other._status.isActive()) {
      return false;
    }
    return this._timeSlot.overlaps(other._timeSlot);
  }

  /**
   * Check if this appointment is active (blocks time slots).
   */
  isActive(): boolean {
    return this._status.isActive();
  }
}
