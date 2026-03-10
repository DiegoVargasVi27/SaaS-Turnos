import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * TimeSlot value object.
 * Represents a time range with start and end times.
 * Immutable.
 * 
 * Business rules:
 * - Start must be before end
 * - Cannot cross day boundaries (both must be on the same day)
 * - Must be in the future (for new appointments)
 */
export class TimeSlot implements ValueObject {
  private constructor(
    private readonly _startsAt: Date,
    private readonly _endsAt: Date
  ) {}

  /**
   * Create a TimeSlot from start time and duration.
   * @param startsAt - Start date/time
   * @param durationMinutes - Duration in minutes
   */
  static fromDuration(startsAt: Date, durationMinutes: number): TimeSlot {
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    return TimeSlot.fromRange(startsAt, endsAt);
  }

  /**
   * Create a TimeSlot from explicit start and end times.
   * @param startsAt - Start date/time
   * @param endsAt - End date/time
   */
  static fromRange(startsAt: Date, endsAt: Date): TimeSlot {
    // Business rule: start must be before end
    if (startsAt >= endsAt) {
      throw new Error("TimeSlot start time must be before end time");
    }

    // Business rule: cannot cross day boundaries
    if (!TimeSlot.isSameDay(startsAt, endsAt)) {
      throw new Error("TimeSlot cannot cross day boundaries");
    }

    return new TimeSlot(startsAt, endsAt);
  }

  /**
   * Create a TimeSlot for a future time (validation for new appointments).
   */
  static createFuture(startsAt: Date, endsAt: Date): TimeSlot {
    const slot = TimeSlot.fromRange(startsAt, endsAt);
    
    // Business rule: appointment must be in the future
    if (!slot.isInFuture()) {
      throw new Error("TimeSlot must be in the future");
    }

    return slot;
  }

  private static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getUTCFullYear() === date2.getUTCFullYear() &&
      date1.getUTCMonth() === date2.getUTCMonth() &&
      date1.getUTCDate() === date2.getUTCDate()
    );
  }

  get startsAt(): Date {
    return this._startsAt;
  }

  get endsAt(): Date {
    return this._endsAt;
  }

  /**
   * Get duration in minutes.
   */
  get durationMinutes(): number {
    return (this._endsAt.getTime() - this._startsAt.getTime()) / 60_000;
  }

  /**
   * Check if this time slot is in the future.
   */
  isInFuture(): boolean {
    return this._startsAt > new Date();
  }

  /**
   * Check if this time slot overlaps with another.
   * Two slots overlap if: startA < endB && endA > startB
   */
  overlaps(other: TimeSlot): boolean {
    return this._startsAt < other._endsAt && this._endsAt > other._startsAt;
  }

  /**
   * Check if this time slot is within a given range.
   * Used to validate appointments are within business availability.
   */
  isWithinRange(rangeStart: Date, rangeEnd: Date): boolean {
    return this._startsAt >= rangeStart && this._endsAt <= rangeEnd;
  }

  equals(other: TimeSlot): boolean {
    return (
      this._startsAt.getTime() === other._startsAt.getTime() &&
      this._endsAt.getTime() === other._endsAt.getTime()
    );
  }

  toString(): string {
    return `${this._startsAt.toISOString()} - ${this._endsAt.toISOString()}`;
  }
}
