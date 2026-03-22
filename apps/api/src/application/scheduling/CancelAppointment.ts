import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { AppointmentId } from "../../domain/shared/types/AppointmentId";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";
import { SchedulingError } from "./SchedulingError";

export interface CancelAppointmentCommand {
  appointmentId: string;
  businessId: string;
}

export class CancelAppointment {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(command: CancelAppointmentCommand): Promise<AppointmentDTO> {
    const appointmentId = AppointmentId.fromString(command.appointmentId);
    const appointment = await this.appointmentRepo.findById(appointmentId);

    if (!appointment) {
      throw new SchedulingError(
        "SCHEDULING_APPOINTMENT_NOT_FOUND",
        `Appointment ${command.appointmentId} not found`,
      );
    }

    // Domain method enforces status transition rules
    // Throws InvalidStatusTransitionException if transition is invalid
    appointment.cancel();

    await this.appointmentRepo.save(appointment);
    return AppointmentDTOAssembler.toDTO(appointment);
  }
}
