import { PrismaClient } from "@prisma/client";
import { IAvailabilityRuleRepository } from "../../../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { AvailabilityRule } from "../../../../domain/scheduling/entities/availability/AvailabilityRule";
import { AvailabilityRuleId } from "../../../../domain/shared/types/AvailabilityRuleId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { AvailabilityRuleDataAssembler } from "../assemblers/AvailabilityRuleDataAssembler";

export class PrismaAvailabilityRuleRepository implements IAvailabilityRuleRepository {
  private readonly assembler = new AvailabilityRuleDataAssembler();

  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: AvailabilityRuleId): Promise<AvailabilityRule | null> {
    const prismaRule = await this.prisma.availabilityRule.findUnique({
      where: { id: id.value },
    });

    return prismaRule ? this.assembler.toDomain(prismaRule) : null;
  }

  async findActiveByBusinessAndWeekday(
    businessId: BusinessId,
    weekday: number,
  ): Promise<AvailabilityRule[]> {
    const prismaRules = await this.prisma.availabilityRule.findMany({
      where: {
        businessId: businessId.value,
        weekday,
        isActive: true,
      },
      orderBy: { startTime: "asc" },
    });

    return prismaRules.map((rule) => this.assembler.toDomain(rule));
  }

  async findByBusinessId(businessId: BusinessId): Promise<AvailabilityRule[]> {
    const prismaRules = await this.prisma.availabilityRule.findMany({
      where: { businessId: businessId.value },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    return prismaRules.map((rule) => this.assembler.toDomain(rule));
  }

  async save(rule: AvailabilityRule): Promise<void> {
    const data = this.assembler.toData(rule);

    await this.prisma.availabilityRule.upsert({
      where: { id: rule.id.value },
      create: data,
      update: data,
    });
  }

  async delete(id: AvailabilityRuleId): Promise<void> {
    await this.prisma.availabilityRule.delete({
      where: { id: id.value },
    });
  }
}
