import { Appointment } from "../../../domain/scheduling/entities/appointment/Appointment";
import { AppointmentDTO } from "../AppointmentDTO";

/**
 * Appointment DTO Assembler.
 * Converts domain Appointment entity to DTO for API responses.
 */
export class AppointmentDTOAssembler {
  static toDTO(appointment: Appointment): AppointmentDTO {
    return new AppointmentDTO(
      appointment.id.value,
      appointment.businessId.value,
      appointment.serviceId.value,
      appointment.clientUserId.value,
      appointment.timeSlot.startsAt.toISOString(),
      appointment.timeSlot.endsAt.toISOString(),
      appointment.status.value,
      appointment.createdAt.toISOString()
    );
  }
}
