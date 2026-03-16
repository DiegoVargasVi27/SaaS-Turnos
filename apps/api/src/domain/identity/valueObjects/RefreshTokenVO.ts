import { DomainValidationError } from "../../shared/errors/DomainValidationError";

export class RefreshTokenVO {
  private constructor(
    private readonly _tokenHash: string,
    private readonly _expiresAt: Date,
  ) {}

  static create(tokenHash: string, expiresAt: Date): RefreshTokenVO {
    if (tokenHash.length < 16) {
      throw new DomainValidationError("IDENTITY_REFRESH_HASH_INVALID", "Token hash must be at least 16 chars");
    }
    if (expiresAt.getTime() <= Date.now()) {
      throw new DomainValidationError("IDENTITY_REFRESH_EXP_INVALID", "Token expiration must be in the future");
    }
    return new RefreshTokenVO(tokenHash, expiresAt);
  }

  get tokenHash(): string {
    return this._tokenHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }
}
