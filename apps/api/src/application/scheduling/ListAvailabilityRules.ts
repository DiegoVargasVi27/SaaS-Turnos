import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { AvailabilityRuleDTO } from "../../dtos/scheduling/AvailabilityRuleDTO";
import { AvailabilityRuleDTOAssembler } from "../../dtos/scheduling/assemblers/AvailabilityRuleDTOAssembler";

export interface ListAvailabilityRulesQuery {
  businessId: string;
}

export class ListAvailabilityRules {
  constructor(private readonly availabilityRuleRepo: IAvailabilityRuleRepository) {}

  async execute(query: ListAvailabilityRulesQuery): Promise<AvailabilityRuleDTO[]> {
    const businessId = BusinessId.fromString(query.businessId);
    const rules = await this.availabilityRuleRepo.findByBusinessId(businessId);
    return rules.map(AvailabilityRuleDTOAssembler.toDTO);
  }
}
