import { randomUUID } from "crypto";
import { ValueObject } from "../interfaces/ValueObject";

/**
 * Business identity value object.
 * Immutable UUID-based identifier.
 */
export class BusinessId implements ValueObject {
  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  /**
   * Create a new BusinessId with generated UUID.
   */
  static create(): BusinessId {
    return new BusinessId(randomUUID());
  }

  /**
   * Reconstitute BusinessId from existing UUID string.
   * Used when loading from database.
   */
  static fromString(value: string): BusinessId {
    return new BusinessId(value);
  }

  private validate(value: string): void {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid BusinessId format: ${value}`);
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: BusinessId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
