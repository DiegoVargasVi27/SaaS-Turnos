import { describe, expect, it } from "vitest";
import { RefreshSession } from "../RefreshSession";
import { IdentityUser } from "../../../domain/identity/entities/IdentityUser";
import { UserIdVO } from "../../../domain/identity/valueObjects/UserIdVO";
import { EmailVO } from "../../../domain/identity/valueObjects/EmailVO";
import { PasswordHashVO } from "../../../domain/identity/valueObjects/PasswordHashVO";
import { IdentityUserRepository } from "../../../domain/identity/repositories/IdentityUserRepository";
import { TokenRepository } from "../../../domain/identity/repositories/TokenRepository";
import { RefreshToken } from "../../../domain/identity/entities/RefreshToken";
import { RefreshTokenVO } from "../../../domain/identity/valueObjects/RefreshTokenVO";
import { TokenIdVO } from "../../../domain/identity/valueObjects/TokenIdVO";
import { TokenService } from "../ports/TokenService";
import { IdentityError } from "../IdentityError";

const hashedValue = "$2a$10$abcdefghijklmnopqrstuv1234567890abcd";

const user = new IdentityUser({
  id: UserIdVO.fromString("22222222-2222-4222-8222-222222222222"),
  email: EmailVO.create("owner@example.com"),
  passwordHash: PasswordHashVO.create(hashedValue),
  fullName: "Owner",
  isActive: true,
  createdAt: new Date(),
});

describe("RefreshSession", () => {
  it("rotates refresh tokens", async () => {
    const token = new RefreshToken({
      id: TokenIdVO.create(),
      userId: user.id,
      value: RefreshTokenVO.create("hash-value-1234567890", new Date(Date.now() + 1000)),
    });
    const identityRepo: IdentityUserRepository = {
      async findByEmail() {
        return user;
      },
      async findById() {
        return user;
      },
      async findPrimaryBusinessLink() {
        return { businessId: "biz-1", role: "OWNER" } as const;
      },
      async createOwnerWithBusiness() {
        return { user, business: { id: "biz-1", name: "Biz", slug: "biz" } };
      },
    };
    let rotated = false;
    const tokenRepo: TokenRepository = {
      async create() {},
      async findActiveByHash() {
        return token;
      },
      async revoke() {
        rotated = true;
      },
      async rotate() {
        rotated = true;
      },
    };
    const tokenService: TokenService = {
      signAccessToken: () => "access",
      signRefreshToken: () => "next-refresh",
      verifyRefreshToken: () => ({ userId: user.id }),
    };

    const useCase = new RefreshSession(identityRepo, tokenRepo, tokenService, 1000, () => new Date());
    const result = await useCase.execute({ refreshToken: "any" });
    expect(result.refreshToken).toBe("next-refresh");
    expect(rotated).toBe(true);
  });

  it("throws when token missing", async () => {
    const identityRepo: IdentityUserRepository = {
      async findByEmail() {
        return user;
      },
      async findById() {
        return user;
      },
      async findPrimaryBusinessLink() {
        return { businessId: "biz-1", role: "OWNER" } as const;
      },
      async createOwnerWithBusiness() {
        return { user, business: { id: "biz-1", name: "Biz", slug: "biz" } };
      },
    };
    const tokenRepo: TokenRepository = {
      async create() {},
      async findActiveByHash() {
        return null;
      },
      async revoke() {},
      async rotate() {},
    };
    const tokenService: TokenService = {
      signAccessToken: () => "access",
      signRefreshToken: () => "next-refresh",
      verifyRefreshToken: () => ({ userId: user.id }),
    };

    const useCase = new RefreshSession(identityRepo, tokenRepo, tokenService, 1000, () => new Date());
    await expect(useCase.execute({ refreshToken: "any" })).rejects.toBeInstanceOf(IdentityError);
  });
});
