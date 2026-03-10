import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * WeekDay value object.
 * Represents a day of the week (0-6, where 0 = Sunday).
 * Immutable.
 */
export class WeekDay implements ValueObject {
  private constructor(private readonly _value: number) {}

  static fromNumber(value: number): WeekDay {
    // Validation: must be 0-6
    if (!Number.isInteger(value) || value < 0 || value > 6) {
      throw new Error("WeekDay must be an integer between 0 (Sunday) and 6 (Saturday)");
    }
    return new WeekDay(value);
  }

  /**
   * Create WeekDay from a Date object.
   */
  static fromDate(date: Date): WeekDay {
    return new WeekDay(date.getUTCDay());
  }

  get value(): number {
    return this._value;
  }

  /**
   * Get day name in English.
   */
  get name(): string {
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[this._value];
  }

  equals(other: WeekDay): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this.name;
  }
}
