import { Appointment } from "../entities/appointment/Appointment";
import { TimeSlot } from "../entities/appointment/TimeSlot";
import { AvailabilityRule } from "../entities/availability/AvailabilityRule";
import { AppointmentOverlapException } from "../exceptions/AppointmentOverlapException";
import { SlotOutsideAvailabilityException } from "../exceptions/SlotOutsideAvailabilityException";

/**
 * Domain service for booking appointments.
 * 
 * This service encapsulates the business logic for:
 * 1. Validating that a requested time slot is within business availability
 * 2. Validating that the slot aligns with the availability rule intervals
 * 3. Checking for overlaps with existing appointments
 * 
 * Pure domain logic - no infrastructure dependencies.
 */
export class AppointmentBookingService {
  /**
   * Validate that a requested appointment slot is bookable.
   * 
   * Business rules validated:
   * - Slot must be within at least one availability rule's time range
   * - Slot start time must align with the availability rule's slot interval
   * - Slot must not overlap with any existing active appointments
   * 
   * @param requestedSlot - The time slot requested for booking
   * @param availabilityRules - Active availability rules for this business/weekday
   * @param existingAppointments - Active appointments for this business on the same date
   * @throws SlotOutsideAvailabilityException if slot doesn't match availability rules
   * @throws AppointmentOverlapException if slot overlaps with existing appointment
   */
  validateBooking(
    requestedSlot: TimeSlot,
    availabilityRules: AvailabilityRule[],
    existingAppointments: Appointment[]
  ): void {
    // Rule 1: Slot must be within availability and aligned with interval
    const isWithinAvailability = this.isSlotWithinAvailability(
      requestedSlot,
      availabilityRules
    );

    if (!isWithinAvailability) {
      throw new SlotOutsideAvailabilityException();
    }

    // Rule 2: Slot must not overlap with existing appointments
    const hasOverlap = existingAppointments.some((appointment) =>
      appointment.timeSlot.overlaps(requestedSlot)
    );

    if (hasOverlap) {
      throw new AppointmentOverlapException();
    }
  }

  /**
   * Check if a slot is within any availability rule and properly aligned.
   */
  private isSlotWithinAvailability(
    slot: TimeSlot,
    availabilityRules: AvailabilityRule[]
  ): boolean {
    // Convert slot times to minutes since midnight (UTC)
    const slotStartMinutes =
      slot.startsAt.getUTCHours() * 60 + slot.startsAt.getUTCMinutes();
    const slotEndMinutes =
      slot.endsAt.getUTCHours() * 60 + slot.endsAt.getUTCMinutes();

    // Check if ANY active rule contains this slot and is properly aligned
    return availabilityRules.some((rule) => {
      if (!rule.isActive) {
        return false;
      }

      // Check if slot is within time range
      const isWithinRange = rule.containsTimeSlot(slotStartMinutes, slotEndMinutes);
      if (!isWithinRange) {
        return false;
      }

      // Check if slot start aligns with the interval
      const isAligned = rule.isAlignedWithInterval(slotStartMinutes);
      return isAligned;
    });
  }

  /**
   * Check if a time slot overlaps with any existing appointments.
   * Helper method for quick overlap checks.
   */
  hasOverlap(slot: TimeSlot, appointments: Appointment[]): boolean {
    return appointments.some((appointment) =>
      appointment.timeSlot.overlaps(slot)
    );
  }
}
