import { randomUUID } from "crypto";
import { DomainValidationError } from "../../shared/errors/DomainValidationError";

export class TokenIdVO {
  private constructor(private readonly _value: string) {}

  static create(): TokenIdVO {
    return new TokenIdVO(randomUUID());
  }

  static fromString(value: string): TokenIdVO {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new DomainValidationError("IDENTITY_TOKEN_ID_INVALID", `Invalid token id: ${value}`);
    }
    return new TokenIdVO(value);
  }

  get value(): string {
    return this._value;
  }
}
