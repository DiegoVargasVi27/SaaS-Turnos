/**
 * Slot Data Transfer Object.
 * Represents an available time slot in API responses.
 */
export class SlotDTO {
  constructor(
    public readonly startsAt: string, // ISO 8601 string
    public readonly endsAt: string    // ISO 8601 string
  ) {}
}
