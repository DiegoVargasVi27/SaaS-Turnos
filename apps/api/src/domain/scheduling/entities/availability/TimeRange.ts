import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * TimeRange value object.
 * Represents a time range as HH:MM strings (e.g., "09:00" to "17:00").
 * Used for availability rules (recurring daily patterns).
 * Immutable.
 */
export class TimeRange implements ValueObject {
  private constructor(
    private readonly _startTime: string,
    private readonly _endTime: string
  ) {}

  static create(startTime: string, endTime: string): TimeRange {
    // Validate format HH:MM
    if (!TimeRange.isValidTimeFormat(startTime)) {
      throw new Error(`Invalid start time format: ${startTime}. Must be HH:MM (24-hour format)`);
    }
    if (!TimeRange.isValidTimeFormat(endTime)) {
      throw new Error(`Invalid end time format: ${endTime}. Must be HH:MM (24-hour format)`);
    }

    // Business rule: end time must be after start time
    const startMinutes = TimeRange.timeToMinutes(startTime);
    const endMinutes = TimeRange.timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw new Error(`End time (${endTime}) must be after start time (${startTime})`);
    }

    return new TimeRange(startTime, endTime);
  }

  private static isValidTimeFormat(time: string): boolean {
    const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
    return regex.test(time);
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  get startTime(): string {
    return this._startTime;
  }

  get endTime(): string {
    return this._endTime;
  }

  /**
   * Get start time in minutes since midnight (for comparisons).
   */
  get startMinutes(): number {
    return TimeRange.timeToMinutes(this._startTime);
  }

  /**
   * Get end time in minutes since midnight (for comparisons).
   */
  get endMinutes(): number {
    return TimeRange.timeToMinutes(this._endTime);
  }

  /**
   * Get duration in minutes.
   */
  get durationMinutes(): number {
    return this.endMinutes - this.startMinutes;
  }

  /**
   * Check if a time slot (in minutes) fits within this range.
   */
  contains(startMinutes: number, endMinutes: number): boolean {
    return startMinutes >= this.startMinutes && endMinutes <= this.endMinutes;
  }

  equals(other: TimeRange): boolean {
    return this._startTime === other._startTime && this._endTime === other._endTime;
  }

  toString(): string {
    return `${this._startTime} - ${this._endTime}`;
  }
}
