import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * ServiceName value object.
 * Encapsulates validation rules for service names.
 * Immutable.
 */
export class ServiceName implements ValueObject {
  private constructor(private readonly _value: string) {}

  /**
   * Create ServiceName from string.
   * @param name - Service name
   */
  static create(name: string): ServiceName {
    const trimmed = name.trim();

    // Business rule: name must have at least 2 characters
    if (trimmed.length < 2) {
      throw new Error("Service name must be at least 2 characters long");
    }

    // Business rule: name cannot exceed 100 characters
    // Keeps UI/UX reasonable and prevents abuse
    if (trimmed.length > 100) {
      throw new Error("Service name cannot exceed 100 characters");
    }

    return new ServiceName(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ServiceName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
