import { Appointment as PrismaAppointment } from "@prisma/client";
import { Appointment } from "../../../../domain/scheduling/entities/appointment/Appointment";
import { AppointmentId } from "../../../../domain/shared/types/AppointmentId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../../domain/shared/types/ServiceId";
import { UserId } from "../../../../domain/shared/types/UserId";
import { TimeSlot } from "../../../../domain/scheduling/entities/appointment/TimeSlot";
import { AppointmentStatus } from "../../../../domain/scheduling/entities/appointment/AppointmentStatus";

/**
 * Appointment Data Assembler.
 * Bidirectional mapper between domain Appointment entity and Prisma Appointment model.
 */
export class AppointmentDataAssembler {
  /**
   * Convert domain Appointment entity to Prisma model data.
   */
  toData(appointment: Appointment): Omit<PrismaAppointment, "business" | "service" | "clientUser"> {
    return {
      id: appointment.id.value,
      businessId: appointment.businessId.value,
      serviceId: appointment.serviceId.value,
      clientUserId: appointment.clientUserId.value,
      startsAt: appointment.timeSlot.startsAt,
      endsAt: appointment.timeSlot.endsAt,
      status: appointment.status.value,
      createdAt: appointment.createdAt,
    };
  }

  /**
   * Convert Prisma model to domain Appointment entity.
   */
  toDomain(prismaAppointment: PrismaAppointment): Appointment {
    return Appointment.reconstitute(
      AppointmentId.fromString(prismaAppointment.id),
      BusinessId.fromString(prismaAppointment.businessId),
      ServiceId.fromString(prismaAppointment.serviceId),
      UserId.fromString(prismaAppointment.clientUserId),
      TimeSlot.fromRange(prismaAppointment.startsAt, prismaAppointment.endsAt),
      AppointmentStatus.fromString(prismaAppointment.status),
      prismaAppointment.createdAt
    );
  }
}
