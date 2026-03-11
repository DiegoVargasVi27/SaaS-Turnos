import { randomUUID } from "crypto";
import { ValueObject } from "../interfaces/ValueObject";

/**
 * Service identity value object.
 * Immutable UUID-based identifier.
 */
export class ServiceId implements ValueObject {
  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  /**
   * Create a new ServiceId with generated UUID.
   */
  static create(): ServiceId {
    return new ServiceId(randomUUID());
  }

  /**
   * Reconstitute ServiceId from existing UUID string.
   * Used when loading from database.
   */
  static fromString(value: string): ServiceId {
    return new ServiceId(value);
  }

  private validate(value: string): void {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid ServiceId format: ${value}`);
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: ServiceId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
