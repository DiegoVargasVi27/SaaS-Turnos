import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";

/**
 * List Appointments Application Service.
 * Use case: Get appointments for a business with optional filters.
 * 
 * Workflow:
 * 1. Query appointments with filters
 * 2. Return DTOs
 */
export class ListAppointmentsService {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  async execute(
    businessId: string,
    filters?: {
      date?: Date;
      status?: PrismaStatus;
    }
  ): Promise<AppointmentDTO[]> {
    const businessIdVO = BusinessId.fromString(businessId);

    // Step 1: Query with filters
    const appointments = await this.appointmentRepository.findByBusiness(
      businessIdVO,
      filters
    );

    // Step 2: Convert to DTOs
    return appointments.map((apt) => AppointmentDTOAssembler.toDTO(apt));
  }
}
