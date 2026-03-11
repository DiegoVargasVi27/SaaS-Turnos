import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * Duration value object representing service duration in minutes.
 * Immutable.
 */
export class Duration implements ValueObject {
  private constructor(private readonly _minutes: number) {}

  /**
   * Create Duration from minutes.
   * @param minutes - Duration in minutes
   */
  static fromMinutes(minutes: number): Duration {
    // Business rule: duration must be positive
    if (minutes <= 0) {
      throw new Error("Duration must be positive");
    }

    // Business rule: duration cannot exceed 8 hours (480 minutes)
    // Prevents unreasonable service durations
    if (minutes > 480) {
      throw new Error("Duration cannot exceed 8 hours (480 minutes)");
    }

    // Business rule: duration must be a multiple of 5 minutes
    // Aligns with slot intervals for consistent scheduling
    if (minutes % 5 !== 0) {
      throw new Error("Duration must be a multiple of 5 minutes");
    }

    return new Duration(minutes);
  }

  get minutes(): number {
    return this._minutes;
  }

  /**
   * Get duration in hours (for display purposes)
   */
  get hours(): number {
    return this._minutes / 60;
  }

  equals(other: Duration): boolean {
    return this._minutes === other._minutes;
  }

  /**
   * Check if this duration is longer than another
   */
  isLongerThan(other: Duration): boolean {
    return this._minutes > other._minutes;
  }

  /**
   * Add two durations together
   */
  add(other: Duration): Duration {
    return Duration.fromMinutes(this._minutes + other._minutes);
  }

  toString(): string {
    if (this._minutes < 60) {
      return `${this._minutes} min`;
    }
    const hours = Math.floor(this._minutes / 60);
    const mins = this._minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
}
