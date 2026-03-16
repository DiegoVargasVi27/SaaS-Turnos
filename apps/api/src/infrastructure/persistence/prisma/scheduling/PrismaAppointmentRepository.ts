import { PrismaClient } from "@prisma/client";
import { IAppointmentRepository } from "../../../../domain/scheduling/repositories/IAppointmentRepository";
import { Appointment } from "../../../../domain/scheduling/entities/appointment/Appointment";
import { AppointmentId } from "../../../../domain/shared/types/AppointmentId";
import { BusinessId } from "../../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../../domain/shared/types/ServiceId";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";
import { AppointmentDataAssembler } from "../assemblers/AppointmentDataAssembler";

export class PrismaAppointmentRepository implements IAppointmentRepository {
  private readonly assembler = new AppointmentDataAssembler();

  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: AppointmentId): Promise<Appointment | null> {
    const prismaAppointment = await this.prisma.appointment.findUnique({
      where: { id: id.value },
    });

    return prismaAppointment ? this.assembler.toDomain(prismaAppointment) : null;
  }

  async findActiveByBusinessAndDateRange(
    businessId: BusinessId,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    const prismaAppointments = await this.prisma.appointment.findMany({
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
    },
  ): Promise<Appointment[]> {
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

    const prismaAppointments = await this.prisma.appointment.findMany({
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
    const count = await this.prisma.appointment.count({
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

    await this.prisma.appointment.upsert({
      where: { id: appointment.id.value },
      create: data,
      update: data,
    });
  }

  async delete(id: AppointmentId): Promise<void> {
    await this.prisma.appointment.delete({
      where: { id: id.value },
    });
  }
}
