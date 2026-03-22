import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";

export interface ListAppointmentsQuery {
  businessId: string;
  date?: string;
  status?: string;
  serviceId?: string;
}

export class ListAppointments {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(query: ListAppointmentsQuery): Promise<AppointmentDTO[]> {
    const businessId = BusinessId.fromString(query.businessId);

    const filters: {
      date?: Date;
      status?: PrismaStatus;
      serviceId?: ServiceId;
    } = {};

    if (query.date) {
      filters.date = new Date(query.date);
    }

    if (query.status) {
      filters.status = query.status as PrismaStatus;
    }

    if (query.serviceId) {
      filters.serviceId = ServiceId.fromString(query.serviceId);
    }

    const appointments = await this.appointmentRepo.findByBusiness(businessId, filters);
    return appointments.map(AppointmentDTOAssembler.toDTO);
  }
}
