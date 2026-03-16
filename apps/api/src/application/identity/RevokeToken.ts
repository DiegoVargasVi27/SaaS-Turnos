import { TokenRepository } from "../../domain/identity/repositories/TokenRepository";
import { TokenService } from "./ports/TokenService";
import { IdentityError } from "./IdentityError";
import { hashToken } from "../../lib/auth";

export interface RevokeTokenCommand {
  refreshToken: string;
}

export class RevokeToken {
  constructor(
    private readonly tokenRepo: TokenRepository,
    private readonly tokenService: TokenService,
    private readonly clock: () => Date,
  ) {}

  async execute(command: RevokeTokenCommand): Promise<void> {
    const payload = this.tokenService.verifyRefreshToken(command.refreshToken);
    const tokenHash = hashToken(command.refreshToken);
    const stored = await this.tokenRepo.findActiveByHash(tokenHash);
    if (!stored || stored.userId.value !== payload.userId.value) {
      throw new IdentityError("IDENTITY_REFRESH_REVOKED", "Token already revoked or invalid");
    }

    await this.tokenRepo.revoke(stored.id, this.clock());
  }
}
