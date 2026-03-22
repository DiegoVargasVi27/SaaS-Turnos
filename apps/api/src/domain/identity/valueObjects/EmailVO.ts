import { DomainValidationError } from "../../shared/errors/DomainValidationError";

export class EmailVO {
  private constructor(private readonly _value: string) {}

  static create(email: string): EmailVO {
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(normalized)) {
      throw new DomainValidationError("IDENTITY_EMAIL_INVALID", `Invalid email format: ${email}`);
    }
    return new EmailVO(normalized);
  }

  get value(): string {
    return this._value;
  }

  equals(other: EmailVO): boolean {
    return this._value === other._value;
  }
}
