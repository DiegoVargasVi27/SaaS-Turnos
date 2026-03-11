import { AvailabilityRule } from "../entities/availability/AvailabilityRule";
import { TimeSlot } from "../entities/appointment/TimeSlot";
import { Appointment } from "../entities/appointment/Appointment";

/**
 * Domain service for generating available time slots.
 * 
 * This service encapsulates the business logic for:
 * 1. Generating all possible slots from availability rules
 * 2. Filtering out past slots
 * 3. Filtering out slots that overlap with existing appointments
 * 
 * Pure domain logic - no infrastructure dependencies.
 */
export class SlotGenerationService {
  /**
   * Generate available slots for a specific date, considering availability rules and existing appointments.
   * 
   * @param availabilityRules - Active availability rules for the business on this weekday
   * @param targetDate - The date to generate slots for (should be start of day in UTC)
   * @param durationMinutes - Duration of the service in minutes
   * @param existingAppointments - Active appointments for this business on the target date
   * @returns Array of available TimeSlots
   */
  generateAvailableSlots(
    availabilityRules: AvailabilityRule[],
    targetDate: Date,
    durationMinutes: number,
    existingAppointments: Appointment[]
  ): TimeSlot[] {
    const now = new Date();

    // Step 1: Generate all possible slots from availability rules
    const allSlots = availabilityRules.flatMap((rule) =>
      this.generateSlotsForRule(rule, targetDate, durationMinutes)
    );

    // Step 2: Filter out past slots
    const futureSlots = allSlots.filter((slot) => slot.startsAt > now);

    // Step 3: Filter out slots that overlap with existing appointments
    const availableSlots = futureSlots.filter((slot) => {
      return !existingAppointments.some((appointment) =>
        appointment.timeSlot.overlaps(slot)
      );
    });

    // Step 4: Sort by start time and remove duplicates
    return this.removeDuplicates(availableSlots);
  }

  /**
   * Generate all possible slots for a single availability rule.
   */
  private generateSlotsForRule(
    rule: AvailabilityRule,
    targetDate: Date,
    durationMinutes: number
  ): TimeSlot[] {
    if (!rule.isActive) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const timeRange = rule.timeRange;
    const slotInterval = rule.slotInterval;

    // Calculate start and end times for this day
    const dayStart = new Date(targetDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const startTime = new Date(dayStart);
    const [startHours, startMinutes] = timeRange.startTime.split(":").map(Number);
    startTime.setUTCHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(dayStart);
    const [endHours, endMinutes] = timeRange.endTime.split(":").map(Number);
    endTime.setUTCHours(endHours, endMinutes, 0, 0);

    const durationMs = durationMinutes * 60_000;
    const stepMs = slotInterval.minutes * 60_000;

    // Generate slots
    for (
      let cursor = startTime.getTime();
      cursor + durationMs <= endTime.getTime();
      cursor += stepMs
    ) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + durationMs);

      try {
        const slot = TimeSlot.fromRange(slotStart, slotEnd);
        slots.push(slot);
      } catch {
        // Skip invalid slots (e.g., crossing day boundaries)
        continue;
      }
    }

    return slots;
  }

  /**
   * Remove duplicate slots (same start time) and sort by start time.
   */
  private removeDuplicates(slots: TimeSlot[]): TimeSlot[] {
    const uniqueMap = new Map<number, TimeSlot>();

    for (const slot of slots) {
      const startTime = slot.startsAt.getTime();
      if (!uniqueMap.has(startTime)) {
        uniqueMap.set(startTime, slot);
      }
    }

    return Array.from(uniqueMap.values()).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
    );
  }
}
