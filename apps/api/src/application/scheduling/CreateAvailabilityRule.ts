import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { AvailabilityRule } from "../../domain/scheduling/entities/availability/AvailabilityRule";
import { WeekDay } from "../../domain/scheduling/entities/availability/WeekDay";
import { TimeRange } from "../../domain/scheduling/entities/availability/TimeRange";
import { SlotInterval } from "../../domain/scheduling/entities/availability/SlotInterval";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { AvailabilityRuleDTO } from "../../dtos/scheduling/AvailabilityRuleDTO";
import { AvailabilityRuleDTOAssembler } from "../../dtos/scheduling/assemblers/AvailabilityRuleDTOAssembler";

export interface CreateAvailabilityRuleCommand {
  businessId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
}

export class CreateAvailabilityRule {
  constructor(private readonly availabilityRuleRepo: IAvailabilityRuleRepository) {}

  async execute(command: CreateAvailabilityRuleCommand): Promise<AvailabilityRuleDTO> {
    const businessId = BusinessId.fromString(command.businessId);

    // Domain validation happens inside value object factories
    const weekDay = WeekDay.fromNumber(command.weekday);
    const timeRange = TimeRange.create(command.startTime, command.endTime);
    const slotInterval = SlotInterval.create(command.slotIntervalMinutes);

    const rule = AvailabilityRule.create(businessId, weekDay, timeRange, slotInterval);

    await this.availabilityRuleRepo.save(rule);
    return AvailabilityRuleDTOAssembler.toDTO(rule);
  }
}
