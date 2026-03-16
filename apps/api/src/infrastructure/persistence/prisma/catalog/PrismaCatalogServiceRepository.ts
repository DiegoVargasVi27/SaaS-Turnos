import { PrismaClient } from "@prisma/client";
import {
  CatalogBusinessSummary,
  CatalogServiceRepository,
} from "../../../../domain/catalog/repositories/CatalogServiceRepository";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../../domain/shared/types/ServiceId";
import { Service } from "../../../../domain/catalog/entities/service/Service";
import { ServiceDataAssembler } from "../assemblers/ServiceDataAssembler";

export class PrismaCatalogServiceRepository implements CatalogServiceRepository {
  private readonly assembler = new ServiceDataAssembler();

  constructor(private readonly prisma: PrismaClient) {}

  async findBusinessBySlug(slug: string): Promise<CatalogBusinessSummary | null> {
    const business = await this.prisma.business.findUnique({ where: { slug } });
    if (!business) {
      return null;
    }

    return {
      id: BusinessId.fromString(business.id),
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
    };
  }

  async listActiveByBusinessId(businessId: BusinessId): Promise<Service[]> {
    const services = await this.prisma.service.findMany({
      where: { businessId: businessId.value, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return services.map((service) => this.assembler.toDomain(service));
  }

  async findActiveById(serviceId: ServiceId): Promise<Service | null> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId.value, isActive: true },
    });
    return service ? this.assembler.toDomain(service) : null;
  }
}
