import { Entity } from "../../../shared/interfaces/Entity";
import { AvailabilityRuleId } from "../../../shared/types/AvailabilityRuleId";
import { BusinessId } from "../../../shared/types/BusinessId";
import { WeekDay } from "./WeekDay";
import { TimeRange } from "./TimeRange";
import { SlotInterval } from "./SlotInterval";

/**
 * AvailabilityRule aggregate root.
 * Represents a recurring availability pattern for a business on a specific weekday.
 * For example: "Every Monday from 09:00 to 17:00 with 15-minute slots".
 */
export class AvailabilityRule implements Entity {
  private constructor(
    private readonly _id: AvailabilityRuleId,
    private readonly _businessId: BusinessId,
    private readonly _weekDay: WeekDay,
    private readonly _timeRange: TimeRange,
    private readonly _slotInterval: SlotInterval,
    private _isActive: boolean
  ) {}

  /**
   * Create a new AvailabilityRule (for new entities, generates ID).
   */
  static create(
    businessId: BusinessId,
    weekDay: WeekDay,
    timeRange: TimeRange,
    slotInterval: SlotInterval,
    id?: AvailabilityRuleId
  ): AvailabilityRule {
    const ruleId = id ?? AvailabilityRuleId.create();
    return new AvailabilityRule(ruleId, businessId, weekDay, timeRange, slotInterval, true);
  }

  /**
   * Reconstitute from persistence (for existing entities).
   */
  static reconstitute(
    id: AvailabilityRuleId,
    businessId: BusinessId,
    weekDay: WeekDay,
    timeRange: TimeRange,
    slotInterval: SlotInterval,
    isActive: boolean
  ): AvailabilityRule {
    return new AvailabilityRule(id, businessId, weekDay, timeRange, slotInterval, isActive);
  }

  // Getters
  get id(): AvailabilityRuleId {
    return this._id;
  }

  get businessId(): BusinessId {
    return this._businessId;
  }

  get weekDay(): WeekDay {
    return this._weekDay;
  }

  get timeRange(): TimeRange {
    return this._timeRange;
  }

  get slotInterval(): SlotInterval {
    return this._slotInterval;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // Business methods
  activate(): void {
    this._isActive = true;
  }

  deactivate(): void {
    this._isActive = false;
  }

  /**
   * Check if a time slot (in minutes since midnight) fits within this rule.
   */
  containsTimeSlot(startMinutes: number, endMinutes: number): boolean {
    if (!this._isActive) {
      return false;
    }
    return this._timeRange.contains(startMinutes, endMinutes);
  }

  /**
   * Check if a slot start time aligns with the slot interval.
   */
  isAlignedWithInterval(slotStartMinutes: number): boolean {
    const offsetFromRuleStart = slotStartMinutes - this._timeRange.startMinutes;
    return offsetFromRuleStart >= 0 && offsetFromRuleStart % this._slotInterval.minutes === 0;
  }
}
