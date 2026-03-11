import { prisma } from "../../../../lib/prisma";
import { IServiceRepository } from "../../../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../../../domain/catalog/entities/service/Service";
import { ServiceId } from "../../../../domain/shared/types/ServiceId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { ServiceDataAssembler } from "../assemblers/ServiceDataAssembler";

/**
 * Service Repository Implementation using Prisma.
 * Implements IServiceRepository interface from domain layer.
 * 
 * Responsibilities:
 * - Bridge between domain Service and Prisma Service model
 * - Execute database operations via Prisma client
 * - Convert between domain and persistence representations
 */
export class ServiceRepository implements IServiceRepository {
  private assembler = new ServiceDataAssembler();

  async save(service: Service): Promise<Service> {
    const data = this.assembler.toData(service);

    // Upsert: create if new, update if exists
    const saved = await prisma.service.upsert({
      where: { id: service.id.value },
      create: data,
      update: data,
    });

    return this.assembler.toDomain(saved);
  }

  async findById(id: ServiceId): Promise<Service | null> {
    const prismaService = await prisma.service.findUnique({
      where: { id: id.value },
    });

    return prismaService ? this.assembler.toDomain(prismaService) : null;
  }

  async findByBusinessId(businessId: BusinessId): Promise<Service[]> {
    const services = await prisma.service.findMany({
      where: { businessId: businessId.value },
      orderBy: { createdAt: "desc" },
    });

    return services.map((s) => this.assembler.toDomain(s));
  }

  async findActiveByBusinessId(businessId: BusinessId): Promise<Service[]> {
    const services = await prisma.service.findMany({
      where: {
        businessId: businessId.value,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return services.map((s) => this.assembler.toDomain(s));
  }

  async delete(id: ServiceId): Promise<void> {
    // Soft delete: set isActive = false
    // This preserves historical data and existing appointment references
    await prisma.service.update({
      where: { id: id.value },
      data: { isActive: false },
    });
  }

  async exists(id: ServiceId): Promise<boolean> {
    const count = await prisma.service.count({
      where: { id: id.value },
    });
    return count > 0;
  }

  /**
   * Business rule implementation: check if service has future appointments.
   * 
   * A service has future appointments if there are any appointments:
   * - With this serviceId
   * - Starting in the future (startsAt >= now)
   * - With status PENDING or CONFIRMED (not cancelled/completed/no-show)
   */
  async hasFutureAppointments(id: ServiceId): Promise<boolean> {
    const now = new Date();
    const count = await prisma.appointment.count({
      where: {
        serviceId: id.value,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    return count > 0;
  }
}
