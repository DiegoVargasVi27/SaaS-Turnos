import { prisma } from "../../../../lib/prisma";
import { IAppointmentRepository } from "../../../../domain/scheduling/repositories/IAppointmentRepository";
import { Appointment } from "../../../../domain/scheduling/entities/appointment/Appointment";
import { AppointmentId } from "../../../../domain/shared/types/AppointmentId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../../domain/shared/types/ServiceId";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";
import { AppointmentDataAssembler } from "../assemblers/AppointmentDataAssembler";

/**
 * Appointment Repository Implementation using Prisma.
 */
export class AppointmentRepository implements IAppointmentRepository {
  private assembler = new AppointmentDataAssembler();

  async findById(id: AppointmentId): Promise<Appointment | null> {
    const prismaAppointment = await prisma.appointment.findUnique({
      where: { id: id.value },
    });

    return prismaAppointment ? this.assembler.toDomain(prismaAppointment) : null;
  }

  async findActiveByBusinessAndDateRange(
    businessId: BusinessId,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]> {
    const prismaAppointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId.value,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: startDate, lte: endDate },
      },
      orderBy: { startsAt: "asc" },
    });

    return prismaAppointments.map((apt) => this.assembler.toDomain(apt));
  }

  async findByBusiness(
    businessId: BusinessId,
    filters?: {
      date?: Date;
      status?: PrismaStatus;
      serviceId?: ServiceId;
    }
  ): Promise<Appointment[]> {
    // Build date range filter if date is provided
    let dateFilter:
      | {
          gte: Date;
          lte: Date;
        }
      | undefined;

    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    }

    const prismaAppointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId.value,
        ...(dateFilter ? { startsAt: dateFilter } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.serviceId ? { serviceId: filters.serviceId.value } : {}),
      },
      orderBy: { startsAt: "asc" },
    });

    return prismaAppointments.map((apt) => this.assembler.toDomain(apt));
  }

  async hasFutureAppointments(serviceId: ServiceId): Promise<boolean> {
    const now = new Date();
    const count = await prisma.appointment.count({
      where: {
        serviceId: serviceId.value,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    return count > 0;
  }

  async save(appointment: Appointment): Promise<void> {
    const data = this.assembler.toData(appointment);

    await prisma.appointment.upsert({
      where: { id: appointment.id.value },
      create: data,
      update: data,
    });
  }

  async delete(id: AppointmentId): Promise<void> {
    await prisma.appointment.delete({
      where: { id: id.value },
    });
  }
}
