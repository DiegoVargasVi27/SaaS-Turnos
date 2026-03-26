import { PrismaClient } from "@prisma/client";
import {
  CatalogBusinessSummary,
  IServiceRepository,
} from "../../../../domain/catalog/repositories/IServiceRepository";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../../domain/shared/types/ServiceId";
import { Service } from "../../../../domain/catalog/entities/service/Service";
import { ServiceDataAssembler } from "../assemblers/ServiceDataAssembler";

/**
 * Unified Prisma implementation of IServiceRepository.
 * Handles both admin CRUD and public read-only queries for the Service aggregate.
 */
export class PrismaServiceRepository implements IServiceRepository {
  private readonly assembler = new ServiceDataAssembler();

  constructor(private readonly prisma: PrismaClient) {}

  // --- Public query methods (previously CatalogServiceRepository) ---

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

  async findActiveById(serviceId: ServiceId): Promise<Service | null> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId.value, isActive: true },
    });
    return service ? this.assembler.toDomain(service) : null;
  }

  // --- Admin CRUD methods ---

  async save(service: Service): Promise<Service> {
    const data = this.assembler.toData(service);

    const saved = await this.prisma.service.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        durationMin: data.durationMin,
        priceCents: data.priceCents,
        currency: data.currency,
        isActive: data.isActive,
      },
      create: {
        id: data.id,
        businessId: data.businessId,
        name: data.name,
        durationMin: data.durationMin,
        priceCents: data.priceCents,
        currency: data.currency,
        isActive: data.isActive,
      },
    });

    return this.assembler.toDomain(saved);
  }

  async findById(id: ServiceId): Promise<Service | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: id.value },
    });
    return service ? this.assembler.toDomain(service) : null;
  }

  async findByBusinessId(businessId: BusinessId): Promise<Service[]> {
    const services = await this.prisma.service.findMany({
      where: { businessId: businessId.value },
      orderBy: { createdAt: "asc" },
    });
    return services.map((s) => this.assembler.toDomain(s));
  }

  async findActiveByBusinessId(businessId: BusinessId): Promise<Service[]> {
    const services = await this.prisma.service.findMany({
      where: { businessId: businessId.value, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return services.map((s) => this.assembler.toDomain(s));
  }

  async delete(id: ServiceId): Promise<void> {
    await this.prisma.service.update({
      where: { id: id.value },
      data: { isActive: false },
    });
  }

  async exists(id: ServiceId): Promise<boolean> {
    const count = await this.prisma.service.count({
      where: { id: id.value },
    });
    return count > 0;
  }

  async hasFutureAppointments(id: ServiceId): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: {
        serviceId: id.value,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gt: new Date() },
      },
    });
    return count > 0;
  }
}
