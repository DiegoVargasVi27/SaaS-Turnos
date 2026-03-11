import { AvailabilityRule } from "../../../domain/scheduling/entities/availability/AvailabilityRule";
import { AvailabilityRuleDTO } from "../AvailabilityRuleDTO";

/**
 * AvailabilityRule DTO Assembler.
 * Converts domain AvailabilityRule entity to DTO for API responses.
 */
export class AvailabilityRuleDTOAssembler {
  static toDTO(rule: AvailabilityRule): AvailabilityRuleDTO {
    return new AvailabilityRuleDTO(
      rule.id.value,
      rule.businessId.value,
      rule.weekDay.value,
      rule.weekDay.name,
      rule.timeRange.startTime,
      rule.timeRange.endTime,
      rule.slotInterval.minutes,
      rule.isActive
    );
  }
}
