import { PrismaClient, Role } from "@prisma/client";
import { GuestUserRegistrar, GuestUserData } from "../../../../domain/scheduling/ports/GuestUserRegistrar";
import { UserId } from "../../../../domain/shared/types/UserId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { hashPassword } from "../../../../lib/auth";

/**
 * Anti-Corruption Layer implementation for guest user registration.
 *
 * Uses Prisma transactions to atomically upsert the user and their
 * business association. This keeps the Scheduling context free from
 * direct Identity context dependencies.
 */
export class PrismaGuestUserRegistrar implements GuestUserRegistrar {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureGuestUser(businessId: BusinessId, data: GuestUserData): Promise<UserId> {
    const fallbackPassword = await hashPassword(`client-${Date.now()}-${Math.random()}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: data.email },
        update: {
          fullName: data.fullName,
          phone: data.phone,
        },
        create: {
          email: data.email,
          fullName: data.fullName,
          phone: data.phone,
          passwordHash: fallbackPassword,
        },
      });

      await tx.businessUser.upsert({
        where: {
          businessId_userId: {
            businessId: businessId.value,
            userId: user.id,
          },
        },
        update: {},
        create: {
          businessId: businessId.value,
          userId: user.id,
          role: Role.CLIENT,
        },
      });

      return user.id;
    });

    return UserId.fromString(result);
  }
}
