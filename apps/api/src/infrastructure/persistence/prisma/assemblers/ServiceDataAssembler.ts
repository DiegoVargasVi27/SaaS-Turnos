import { Service as PrismaService } from "@prisma/client";
import { Service } from "../../../../domain/catalog/entities/service/Service";

/**
 * Service Data Assembler.
 * Bidirectional mapper between domain Service entity and Prisma Service model.
 * 
 * Why separate models?
 * - Domain entities are pure business logic, no persistence concerns
 * - Prisma models have database-specific annotations and types
 * - This separation allows us to change persistence technology without affecting domain
 */
export class ServiceDataAssembler {
  /**
   * Convert domain Service entity to Prisma Service model.
   * Used when saving to database.
   * 
   * @param service - Domain Service entity
   * @returns Prisma-compatible data object (without createdAt - handled by DB)
   */
  toData(service: Service): Omit<PrismaService, "createdAt"> {
    return {
      id: service.id.value,
      businessId: service.businessId.value,
      name: service.name.value,
      durationMin: service.duration.minutes,
      priceCents: service.price.amountCents,
      currency: service.price.currency,
      isActive: service.isActive,
    };
  }

  /**
   * Convert Prisma Service model to domain Service entity.
   * Used when loading from database.
   * 
   * @param prismaService - Prisma Service model from database
   * @returns Domain Service entity
   */
  toDomain(prismaService: PrismaService): Service {
    return Service.reconstitute(
      prismaService.id,
      prismaService.businessId,
      prismaService.name,
      prismaService.durationMin,
      prismaService.priceCents,
      prismaService.currency,
      prismaService.isActive,
      prismaService.createdAt
    );
  }
}
