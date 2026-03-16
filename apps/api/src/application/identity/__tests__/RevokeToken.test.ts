import { describe, expect, it } from "vitest";
import { RevokeToken } from "../RevokeToken";
import { TokenRepository } from "../../../domain/identity/repositories/TokenRepository";
import { TokenService } from "../ports/TokenService";
import { IdentityUser } from "../../../domain/identity/entities/IdentityUser";
import { UserIdVO } from "../../../domain/identity/valueObjects/UserIdVO";
import { EmailVO } from "../../../domain/identity/valueObjects/EmailVO";
import { PasswordHashVO } from "../../../domain/identity/valueObjects/PasswordHashVO";
import { RefreshToken } from "../../../domain/identity/entities/RefreshToken";
import { RefreshTokenVO } from "../../../domain/identity/valueObjects/RefreshTokenVO";
import { TokenIdVO } from "../../../domain/identity/valueObjects/TokenIdVO";
import { IdentityError } from "../IdentityError";

const hashedValue = "$2a$10$abcdefghijklmnopqrstuv1234567890abcd";

const user = new IdentityUser({
  id: UserIdVO.fromString("33333333-3333-4333-8333-333333333333"),
  email: EmailVO.create("owner@example.com"),
  passwordHash: PasswordHashVO.create(hashedValue),
  fullName: "Owner",
  isActive: true,
  createdAt: new Date(),
});

describe("RevokeToken", () => {
  it("revokes active tokens", async () => {
    let revoked = false;
    const token = new RefreshToken({
      id: TokenIdVO.create(),
      userId: user.id,
      value: RefreshTokenVO.create("hash-value-1234567890", new Date(Date.now() + 1000)),
    });
    const tokenRepo: TokenRepository = {
      async create() {},
      async findActiveByHash() {
        return token;
      },
      async revoke() {
        revoked = true;
      },
      async rotate() {},
    };
    const tokenService: TokenService = {
      signAccessToken: () => "",
      signRefreshToken: () => "",
      verifyRefreshToken: () => ({ userId: user.id }),
    };

    const useCase = new RevokeToken(tokenRepo, tokenService, () => new Date());
    await useCase.execute({ refreshToken: "token" });
    expect(revoked).toBe(true);
  });

  it("throws when token is missing", async () => {
    const tokenRepo: TokenRepository = {
      async create() {},
      async findActiveByHash() {
        return null;
      },
      async revoke() {},
      async rotate() {},
    };
    const tokenService: TokenService = {
      signAccessToken: () => "",
      signRefreshToken: () => "",
      verifyRefreshToken: () => ({ userId: user.id }),
    };

    const useCase = new RevokeToken(tokenRepo, tokenService, () => new Date());
    await expect(useCase.execute({ refreshToken: "token" })).rejects.toBeInstanceOf(IdentityError);
  });
});
