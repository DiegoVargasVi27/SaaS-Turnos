import { AvailabilityRule as PrismaAvailabilityRule } from "@prisma/client";
import { AvailabilityRule } from "../../../../domain/scheduling/entities/availability/AvailabilityRule";
import { AvailabilityRuleId } from "../../../../domain/shared/types/AvailabilityRuleId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { WeekDay } from "../../../../domain/scheduling/entities/availability/WeekDay";
import { TimeRange } from "../../../../domain/scheduling/entities/availability/TimeRange";
import { SlotInterval } from "../../../../domain/scheduling/entities/availability/SlotInterval";

/**
 * AvailabilityRule Data Assembler.
 * Bidirectional mapper between domain AvailabilityRule entity and Prisma AvailabilityRule model.
 */
export class AvailabilityRuleDataAssembler {
  /**
   * Convert domain AvailabilityRule entity to Prisma model data.
   */
  toData(rule: AvailabilityRule): Omit<PrismaAvailabilityRule, "business"> {
    return {
      id: rule.id.value,
      businessId: rule.businessId.value,
      weekday: rule.weekDay.value,
      startTime: rule.timeRange.startTime,
      endTime: rule.timeRange.endTime,
      slotIntervalMin: rule.slotInterval.minutes,
      isActive: rule.isActive,
    };
  }

  /**
   * Convert Prisma model to domain AvailabilityRule entity.
   */
  toDomain(prismaRule: PrismaAvailabilityRule): AvailabilityRule {
    return AvailabilityRule.reconstitute(
      AvailabilityRuleId.fromString(prismaRule.id),
      BusinessId.fromString(prismaRule.businessId),
      WeekDay.fromNumber(prismaRule.weekday),
      TimeRange.create(prismaRule.startTime, prismaRule.endTime),
      SlotInterval.create(prismaRule.slotIntervalMin),
      prismaRule.isActive
    );
  }
}
