import { randomUUID } from "crypto";
import { ValueObject } from "../interfaces/ValueObject";

export class UserId implements ValueObject {
  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  static create(): UserId {
    return new UserId(randomUUID());
  }

  static fromString(value: string): UserId {
    return new UserId(value);
  }

  private validate(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid UserId format: ${value}`);
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
