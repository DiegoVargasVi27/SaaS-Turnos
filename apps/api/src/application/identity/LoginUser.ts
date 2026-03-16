import { IdentityUserRepository } from "../../domain/identity/repositories/IdentityUserRepository";
import { TokenRepository } from "../../domain/identity/repositories/TokenRepository";
import { EmailVO } from "../../domain/identity/valueObjects/EmailVO";
import { RefreshTokenVO } from "../../domain/identity/valueObjects/RefreshTokenVO";
import { RefreshToken } from "../../domain/identity/entities/RefreshToken";
import { IdentityError } from "./IdentityError";
import { PasswordHasher } from "./ports/PasswordHasher";
import { TokenService } from "./ports/TokenService";
import { hashToken } from "../../lib/auth";

export interface LoginUserCommand {
  email: string;
  password: string;
}

export interface LoginUserResult {
  accessToken: string;
  refreshToken: string;
}

export class LoginUser {
  constructor(
    private readonly identityRepo: IdentityUserRepository,
    private readonly tokenRepo: TokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTtlMs: number,
    private readonly clock: () => Date,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    const email = EmailVO.create(command.email);
    const user = await this.identityRepo.findByEmail(email);
    if (!user) {
      throw new IdentityError("IDENTITY_INVALID_CREDENTIALS", "Invalid credentials");
    }

    if (!user.isActive) {
      throw new IdentityError("IDENTITY_USER_INACTIVE", "User is inactive");
    }

    const matches = await this.passwordHasher.compare(command.password, user.passwordHash);
    if (!matches) {
      throw new IdentityError("IDENTITY_INVALID_CREDENTIALS", "Invalid credentials");
    }

    const businessLink = await this.identityRepo.findPrimaryBusinessLink(user.id);
    if (!businessLink) {
      throw new IdentityError("IDENTITY_USER_WITHOUT_BUSINESS", "User without assigned business");
    }

    const accessToken = this.tokenService.signAccessToken({
      userId: user.id,
      businessId: businessLink.businessId,
      role: businessLink.role,
    });

    const now = this.clock();
    const refreshPlain = this.tokenService.signRefreshToken(user.id);
    const refreshVO = RefreshTokenVO.create(hashToken(refreshPlain), new Date(now.getTime() + this.refreshTtlMs));
    const refreshEntity = RefreshToken.issue(user.id, refreshVO, now);
    await this.tokenRepo.create(refreshEntity);

    return {
      accessToken,
      refreshToken: refreshPlain,
    };
  }
}
