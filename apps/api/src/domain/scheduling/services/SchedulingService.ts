import { AvailabilityRule } from "../entities/availability/AvailabilityRule";
import { Appointment } from "../entities/appointment/Appointment";
import { TimeSlot } from "../entities/appointment/TimeSlot";
import { AppointmentBookingService } from "./AppointmentBookingService";
import { SlotGenerationService } from "./SlotGenerationService";

export class SchedulingService {
  private readonly slotGeneration = new SlotGenerationService();
  private readonly booking = new AppointmentBookingService();

  generateAvailability(
    availabilityRules: AvailabilityRule[],
    targetDate: Date,
    serviceDurationMin: number,
    existingAppointments: Appointment[],
  ): TimeSlot[] {
    return this.slotGeneration.generateAvailableSlots(
      availabilityRules,
      targetDate,
      serviceDurationMin,
      existingAppointments,
    );
  }

  assertSlotBookable(
    requestedSlot: TimeSlot,
    availabilityRules: AvailabilityRule[],
    existingAppointments: Appointment[],
  ): void {
    this.booking.validateBooking(requestedSlot, availabilityRules, existingAppointments);
  }
}
