import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * SlotInterval value object.
 * Represents the time interval between appointment slots in minutes.
 * Must be a positive integer, typically 5, 10, 15, 30, or 60 minutes.
 * Immutable.
 */
export class SlotInterval implements ValueObject {
  private constructor(private readonly _minutes: number) {}

  static create(minutes: number): SlotInterval {
    // Validation: must be positive integer
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new Error("SlotInterval must be a positive integer");
    }

    // Business rule: must be reasonable (between 1 and 480 minutes = 8 hours)
    if (minutes > 480) {
      throw new Error("SlotInterval cannot exceed 480 minutes (8 hours)");
    }

    // Optional: check if it's a common interval (5, 10, 15, 30, 60)
    // For flexibility, we'll allow any positive integer but recommend multiples of 5
    if (minutes % 5 !== 0) {
      // Just a warning, not an error
      console.warn(`SlotInterval of ${minutes} minutes is not a multiple of 5. Consider using 5, 10, 15, 30, or 60.`);
    }

    return new SlotInterval(minutes);
  }

  get minutes(): number {
    return this._minutes;
  }

  equals(other: SlotInterval): boolean {
    return this._minutes === other._minutes;
  }

  toString(): string {
    return `${this._minutes} min`;
  }
}
