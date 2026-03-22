import { describe, expect, it } from "vitest";
import { LoginUser } from "../LoginUser";
import { IdentityUser } from "../../../domain/identity/entities/IdentityUser";
import { UserIdVO } from "../../../domain/identity/valueObjects/UserIdVO";
import { EmailVO } from "../../../domain/identity/valueObjects/EmailVO";
import { PasswordHashVO } from "../../../domain/identity/valueObjects/PasswordHashVO";
import { IdentityUserRepository } from "../../../domain/identity/repositories/IdentityUserRepository";
import { TokenRepository } from "../../../domain/identity/repositories/TokenRepository";
import { PasswordHasher } from "../ports/PasswordHasher";
import { TokenService } from "../ports/TokenService";
import { RefreshToken } from "../../../domain/identity/entities/RefreshToken";
import { RefreshTokenVO } from "../../../domain/identity/valueObjects/RefreshTokenVO";
import { TokenIdVO } from "../../../domain/identity/valueObjects/TokenIdVO";
import { IdentityError } from "../IdentityError";

const hashedValue = "$2a$10$abcdefghijklmnopqrstuv1234567890abcd";

const user = new IdentityUser({
  id: UserIdVO.fromString("11111111-1111-4111-8111-111111111111"),
  email: EmailVO.create("owner@example.com"),
  passwordHash: PasswordHashVO.create(hashedValue),
  fullName: "Owner",
  isActive: true,
  createdAt: new Date(),
});

function buildDeps(overrides: Partial<IdentityUserRepository> = {}) {
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
    ...overrides,
  };

  const tokens: TokenRepository = {
    async create() {},
    async findActiveByHash() {
      return new RefreshToken({
        id: TokenIdVO.create(),
        userId: user.id,
        value: RefreshTokenVO.create("hash-value", new Date(Date.now() + 1000)),
      });
    },
    async revoke() {},
    async rotate() {},
  };

  const passwordHasher: PasswordHasher = {
    async hash(plain) {
      return PasswordHashVO.create(`${hashedValue}:${plain}`);
    },
    async compare(plain, hash) {
      return plain === "password" && hash.value === hashedValue;
    },
  };

  const tokenService: TokenService = {
    signAccessToken: () => "access",
    signRefreshToken: () => "refresh",
    verifyRefreshToken: () => ({ userId: user.id }),
  };

  return { identityRepo, tokens, passwordHasher, tokenService };
}

describe("LoginUser", () => {
  it("returns tokens for valid credentials", async () => {
    const deps = buildDeps();
    const useCase = new LoginUser(
      deps.identityRepo,
      deps.tokens,
      deps.passwordHasher,
      deps.tokenService,
      1000,
      () => new Date(),
    );

    const result = await useCase.execute({ email: "owner@example.com", password: "password" });
    expect(result.accessToken).toBe("access");
    expect(result.refreshToken).toBe("refresh");
  });

  it("throws for invalid password", async () => {
    const deps = buildDeps();
    const useCase = new LoginUser(
      deps.identityRepo,
      deps.tokens,
      deps.passwordHasher,
      deps.tokenService,
      1000,
      () => new Date(),
    );

    await expect(useCase.execute({ email: "owner@example.com", password: "nope" })).rejects.toBeInstanceOf(
      IdentityError,
    );
  });
});
