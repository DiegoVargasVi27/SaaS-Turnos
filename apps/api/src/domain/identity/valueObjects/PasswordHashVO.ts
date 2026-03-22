import { DomainValidationError } from "../../shared/errors/DomainValidationError";

export class PasswordHashVO {
  private constructor(private readonly _value: string) {}

  static create(hash: string): PasswordHashVO {
    if (hash.length < 20) {
      throw new DomainValidationError("IDENTITY_PASSWORD_HASH_INVALID", "Password hash is too short");
    }
    return new PasswordHashVO(hash);
  }

  get value(): string {
    return this._value;
  }
}
