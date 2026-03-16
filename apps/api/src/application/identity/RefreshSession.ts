import { IdentityUserRepository } from "../../domain/identity/repositories/IdentityUserRepository";
import { TokenRepository } from "../../domain/identity/repositories/TokenRepository";
import { RefreshTokenVO } from "../../domain/identity/valueObjects/RefreshTokenVO";
import { RefreshToken } from "../../domain/identity/entities/RefreshToken";
import { IdentityError } from "./IdentityError";
import { TokenService } from "./ports/TokenService";
import { hashToken } from "../../lib/auth";

export interface RefreshSessionCommand {
  refreshToken: string;
}

export interface RefreshSessionResult {
  accessToken: string;
  refreshToken: string;
}

export class RefreshSession {
  constructor(
    private readonly identityRepo: IdentityUserRepository,
    private readonly tokenRepo: TokenRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTtlMs: number,
    private readonly clock: () => Date,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
    const payload = this.tokenService.verifyRefreshToken(command.refreshToken);
    const tokenHash = hashToken(command.refreshToken);
    const storedToken = await this.tokenRepo.findActiveByHash(tokenHash);
    if (!storedToken || !storedToken.isActive(this.clock())) {
      throw new IdentityError("IDENTITY_REFRESH_INVALID", "Invalid or expired refresh token");
    }

    const user = await this.identityRepo.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new IdentityError("IDENTITY_REFRESH_INVALID", "User inactive");
    }

    const businessLink = await this.identityRepo.findPrimaryBusinessLink(user.id);
    if (!businessLink) {
      throw new IdentityError("IDENTITY_USER_WITHOUT_BUSINESS", "Business context missing");
    }

    const now = this.clock();
    const accessToken = this.tokenService.signAccessToken({
      userId: user.id,
      businessId: businessLink.businessId,
      role: businessLink.role,
    });
    const newRefreshPlain = this.tokenService.signRefreshToken(user.id);
    const newRefreshVO = RefreshTokenVO.create(hashToken(newRefreshPlain), new Date(now.getTime() + this.refreshTtlMs));
    const newRefreshEntity = RefreshToken.issue(user.id, newRefreshVO, now);

    await this.tokenRepo.rotate(storedToken.id, newRefreshEntity, now);

    return { accessToken, refreshToken: newRefreshPlain };
  }
}
