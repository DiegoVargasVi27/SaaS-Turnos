/**
 * AvailabilityRule Data Transfer Object.
 * Represents an availability rule in API responses.
 */
export class AvailabilityRuleDTO {
  constructor(
    public readonly id: string,
    public readonly businessId: string,
    public readonly weekday: number,
    public readonly weekdayName: string,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly slotIntervalMin: number,
    public readonly isActive: boolean
  ) {}
}
