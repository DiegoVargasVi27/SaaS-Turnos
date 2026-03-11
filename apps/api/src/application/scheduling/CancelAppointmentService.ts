import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { AppointmentId } from "../../domain/shared/types/AppointmentId";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";
import { AppointmentNotFoundException } from "../../domain/scheduling/exceptions/AppointmentNotFoundException";

/**
 * Cancel Appointment Application Service.
 * Use case: Cancel an existing appointment.
 * 
 * Workflow:
 * 1. Find appointment by ID
 * 2. Cancel it (domain logic validates state transitions)
 * 3. Save updated appointment
 * 4. Return DTO
 */
export class CancelAppointmentService {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  async execute(appointmentId: string): Promise<AppointmentDTO> {
    const appointmentIdVO = AppointmentId.fromString(appointmentId);

    // Step 1: Find appointment
    const appointment = await this.appointmentRepository.findById(appointmentIdVO);
    if (!appointment) {
      throw new AppointmentNotFoundException(appointmentId);
    }

    // Step 2: Cancel (domain logic)
    appointment.cancel();

    // Step 3: Save
    await this.appointmentRepository.save(appointment);

    // Step 4: Return DTO
    return AppointmentDTOAssembler.toDTO(appointment);
  }
}
