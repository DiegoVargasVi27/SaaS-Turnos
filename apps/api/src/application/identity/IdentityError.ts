export type IdentityErrorCode =
  | "IDENTITY_EMAIL_INVALID"
  | "IDENTITY_PASSWORD_INVALID"
  | "IDENTITY_INVALID_CREDENTIALS"
  | "IDENTITY_USER_INACTIVE"
  | "IDENTITY_USER_WITHOUT_BUSINESS"
  | "IDENTITY_REFRESH_INVALID"
  | "IDENTITY_REFRESH_REVOKED"
  | "IDENTITY_EMAIL_CONFLICT"
  | "IDENTITY_BUSINESS_SLUG_CONFLICT"
  | "IDENTITY_UNEXPECTED";

export class IdentityError extends Error {
  constructor(public readonly code: IdentityErrorCode, message: string) {
    super(message);
    this.name = "IdentityError";
  }
}
