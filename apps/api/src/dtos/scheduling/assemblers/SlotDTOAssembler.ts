import { TimeSlot } from "../../../domain/scheduling/entities/appointment/TimeSlot";
import { SlotDTO } from "../SlotDTO";

/**
 * Slot DTO Assembler.
 * Converts domain TimeSlot value object to DTO for API responses.
 */
export class SlotDTOAssembler {
  static toDTO(slot: TimeSlot): SlotDTO {
    return new SlotDTO(
      slot.startsAt.toISOString(),
      slot.endsAt.toISOString()
    );
  }

  static toDTOList(slots: TimeSlot[]): SlotDTO[] {
    return slots.map((slot) => SlotDTOAssembler.toDTO(slot));
  }
}
