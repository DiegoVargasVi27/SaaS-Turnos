import { randomUUID } from "crypto";
import { ValueObject } from "../interfaces/ValueObject";

export class AppointmentId implements ValueObject {
  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  static create(): AppointmentId {
    return new AppointmentId(randomUUID());
  }

  static fromString(value: string): AppointmentId {
    return new AppointmentId(value);
  }

  private validate(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid AppointmentId format: ${value}`);
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: AppointmentId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
