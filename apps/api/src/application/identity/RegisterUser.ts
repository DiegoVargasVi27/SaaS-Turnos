import { Role } from "@prisma/client";
import { IdentityUserRepository } from "../../domain/identity/repositories/IdentityUserRepository";
import { TokenRepository } from "../../domain/identity/repositories/TokenRepository";
import { EmailVO } from "../../domain/identity/valueObjects/EmailVO";
import { RefreshTokenVO } from "../../domain/identity/valueObjects/RefreshTokenVO";
import { RefreshToken } from "../../domain/identity/entities/RefreshToken";
import { IdentityError } from "./IdentityError";
import { PasswordHasher } from "./ports/PasswordHasher";
import { TokenService } from "./ports/TokenService";
import { hashToken } from "../../lib/auth";

export interface RegisterUserCommand {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  businessSlug: string;
}

export interface RegisterUserResult {
  user: { id: string; email: string; fullName: string };
  business: { id: string; slug: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export class RegisterUser {
  constructor(
    private readonly identityRepo: IdentityUserRepository,
    private readonly tokenRepo: TokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTtlMs: number,
    private readonly clock: () => Date,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = EmailVO.create(command.email);
    const existing = await this.identityRepo.findByEmail(email);
    if (existing) {
      throw new IdentityError("IDENTITY_EMAIL_CONFLICT", "Email already registered");
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const creation = await this.identityRepo.createOwnerWithBusiness({
      businessName: command.businessName,
      businessSlug: command.businessSlug,
      email,
      fullName: command.fullName,
      passwordHash: passwordHash.value,
    });

    const businessLink = await this.identityRepo.findPrimaryBusinessLink(creation.user.id);
    if (!businessLink) {
      throw new IdentityError("IDENTITY_USER_WITHOUT_BUSINESS", "User was created without a business link");
    }

    const accessToken = this.tokenService.signAccessToken({
      userId: creation.user.id,
      businessId: businessLink.businessId,
      role: businessLink.role ?? Role.OWNER,
    });

    const now = this.clock();
    const refreshTokenPlain = this.tokenService.signRefreshToken(creation.user.id);
    const refreshTokenValue = RefreshTokenVO.create(
      hashToken(refreshTokenPlain),
      new Date(now.getTime() + this.refreshTtlMs),
    );
    const refreshEntity = RefreshToken.issue(creation.user.id, refreshTokenValue, now);
    await this.tokenRepo.create(refreshEntity);

    return {
      user: { id: creation.user.id.value, email: creation.user.email.value, fullName: creation.user.fullName },
      business: creation.business,
      accessToken,
      refreshToken: refreshTokenPlain,
    };
  }
}
