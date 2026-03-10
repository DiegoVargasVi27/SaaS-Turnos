import { AvailabilityRule } from "../entities/availability/AvailabilityRule";
import { AvailabilityRuleId } from "../../shared/types/AvailabilityRuleId";
import { BusinessId } from "../../shared/types/BusinessId";

/**
 * Repository interface for AvailabilityRule aggregate.
 * Defines persistence operations following Repository pattern.
 */
export interface IAvailabilityRuleRepository {
  /**
   * Find an availability rule by ID.
   */
  findById(id: AvailabilityRuleId): Promise<AvailabilityRule | null>;

  /**
   * Find all active availability rules for a business on a specific weekday.
   */
  findActiveByBusinessAndWeekday(businessId: BusinessId, weekday: number): Promise<AvailabilityRule[]>;

  /**
   * Find all availability rules for a business (active and inactive).
   */
  findByBusinessId(businessId: BusinessId): Promise<AvailabilityRule[]>;

  /**
   * Save a new or updated availability rule.
   */
  save(rule: AvailabilityRule): Promise<void>;

  /**
   * Delete an availability rule.
   */
  delete(id: AvailabilityRuleId): Promise<void>;
}
