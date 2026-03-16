import { Prisma, PrismaClient, Role, User } from "@prisma/client";
import {
  CreatedOwnerResult,
  IdentityUserRepository,
  RegisterUserData,
} from "../../../../domain/identity/repositories/IdentityUserRepository";
import { IdentityUser } from "../../../../domain/identity/entities/IdentityUser";
import { UserIdVO } from "../../../../domain/identity/valueObjects/UserIdVO";
import { EmailVO } from "../../../../domain/identity/valueObjects/EmailVO";
import { PasswordHashVO } from "../../../../domain/identity/valueObjects/PasswordHashVO";
import { IdentityError } from "../../../../application/identity/IdentityError";

export class PrismaIdentityUserRepository implements IdentityUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(user: User): IdentityUser {
    return new IdentityUser({
      id: UserIdVO.fromString(user.id),
      email: EmailVO.create(user.email),
      passwordHash: PasswordHashVO.create(user.passwordHash),
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  }

  async findByEmail(email: EmailVO): Promise<IdentityUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email: email.value } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: UserIdVO): Promise<IdentityUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: id.value } });
    return user ? this.toDomain(user) : null;
  }

  async findPrimaryBusinessLink(userId: UserIdVO) {
    const link = await this.prisma.businessUser.findFirst({
      where: { userId: userId.value },
      orderBy: { createdAt: "asc" },
    });
    if (!link) {
      return null;
    }
    return { businessId: link.businessId, role: link.role };
  }

  async createOwnerWithBusiness(data: RegisterUserData): Promise<CreatedOwnerResult> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: { name: data.businessName, slug: data.businessSlug },
        });
        const user = await tx.user.create({
          data: {
            email: data.email.value,
            fullName: data.fullName,
            passwordHash: data.passwordHash,
          },
        });
        await tx.businessUser.create({
          data: {
            businessId: business.id,
            userId: user.id,
            role: Role.OWNER,
          },
        });
        return { business, user };
      });
      return {
        business: { id: result.business.id, slug: result.business.slug, name: result.business.name },
        user: this.toDomain(result.user),
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(",") : String(err.meta?.target ?? "");
        if (target.includes("Business_slug")) {
          throw new IdentityError("IDENTITY_BUSINESS_SLUG_CONFLICT", "Business slug already exists");
        }
        if (target.includes("User_email") || target.includes("email")) {
          throw new IdentityError("IDENTITY_EMAIL_CONFLICT", "Email already exists");
        }
      }
      throw err;
    }
  }
}
