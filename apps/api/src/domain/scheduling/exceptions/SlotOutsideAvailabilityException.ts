export class SlotOutsideAvailabilityException extends Error {
  constructor() {
    super("Selected slot is outside business availability rules");
    this.name = "SlotOutsideAvailabilityException";
  }
}
