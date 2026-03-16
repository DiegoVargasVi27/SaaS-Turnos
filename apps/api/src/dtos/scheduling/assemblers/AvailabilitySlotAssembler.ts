import { TimeSlot } from "../../../domain/scheduling/entities/appointment/TimeSlot";
import { AvailabilitySlotDTO } from "../AvailabilitySlotDTO";

export class AvailabilitySlotAssembler {
  static toDTO(slot: TimeSlot): AvailabilitySlotDTO {
    return {
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
    };
  }
}
