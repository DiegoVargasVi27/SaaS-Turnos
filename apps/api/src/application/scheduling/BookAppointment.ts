import { Prisma, PrismaClient, Role } from "@prisma/client";
import { CatalogServiceRepository } from "../../domain/catalog/repositories/CatalogServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { UserId } from "../../domain/shared/types/UserId";
import { WeekDay } from "../../domain/scheduling/entities/availability/WeekDay";
import { Appointment } from "../../domain/scheduling/entities/appointment/Appointment";
import { TimeSlot } from "../../domain/scheduling/entities/appointment/TimeSlot";
import { SchedulingService } from "../../domain/scheduling/services/SchedulingService";
import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { SlotOutsideAvailabilityException } from "../../domain/scheduling/exceptions/SlotOutsideAvailabilityException";
import { AppointmentOverlapException } from "../../domain/scheduling/exceptions/AppointmentOverlapException";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";
import { CatalogError } from "../catalog/CatalogError";
import { SchedulingError } from "./SchedulingError";
import { hashPassword } from "../../lib/auth";
import { AppointmentDataAssembler } from "../../infrastructure/persistence/prisma/assemblers/AppointmentDataAssembler";

export interface BookAppointmentCommand {
  businessSlug: string;
  serviceId: string;
  startsAt: Date;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
}

export class BookAppointment {
  private readonly appointmentAssembler = new AppointmentDataAssembler();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly catalogRepo: CatalogServiceRepository,
    private readonly availabilityRepo: IAvailabilityRuleRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly schedulingService: SchedulingService,
  ) {}

  async execute(command: BookAppointmentCommand): Promise<AppointmentDTO> {
    const business = await this.catalogRepo.findBusinessBySlug(command.businessSlug);
    if (!business) {
      throw new SchedulingError(
        "SCHEDULING_BUSINESS_NOT_FOUND",
        `Business ${command.businessSlug} not found`,
      );
    }

    const serviceId = ServiceId.fromString(command.serviceId);
    const service = await this.catalogRepo.findActiveById(serviceId);
    if (!service || !service.businessId.equals(business.id)) {
      throw new CatalogError("CATALOG_SERVICE_NOT_FOUND", "Service not found");
    }
    if (!service.isActive) {
      throw new SchedulingError("SCHEDULING_SERVICE_INACTIVE", "Service is inactive");
    }

    const slot = TimeSlot.fromDuration(command.startsAt, service.duration.minutes);

    // Ensure slot is bookable by regenerating availability for the same date
    const weekDay = WeekDay.fromDate(command.startsAt);
    const availabilityRules = await this.availabilityRepo.findActiveByBusinessAndWeekday(
      business.id,
      weekDay.value,
    );

    const dayStart = new Date(command.startsAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(command.startsAt);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await this.appointmentRepo.findActiveByBusinessAndDateRange(
      business.id,
      dayStart,
      dayEnd,
    );

    try {
      this.schedulingService.assertSlotBookable(slot, availabilityRules, existingAppointments);
    } catch (error) {
      if (error instanceof SlotOutsideAvailabilityException || error instanceof AppointmentOverlapException) {
        throw new SchedulingError("SCHEDULING_SLOT_TAKEN", error.message);
      }
      throw error;
    }

    const fallbackPassword = await hashPassword(`client-${Date.now()}-${Math.random()}`);

    try {
      const appointmentRecord = await this.prisma.$transaction(async (tx) => {
        const clientUser = await tx.user.upsert({
          where: { email: command.clientEmail },
          update: {
            fullName: command.clientName,
            phone: command.clientPhone,
          },
          create: {
            email: command.clientEmail,
            fullName: command.clientName,
            phone: command.clientPhone,
            passwordHash: fallbackPassword,
          },
        });

        await tx.businessUser.upsert({
          where: {
            businessId_userId: {
              businessId: business.id.value,
              userId: clientUser.id,
            },
          },
          update: {},
          create: {
            businessId: business.id.value,
            userId: clientUser.id,
            role: Role.CLIENT,
          },
        });

        const appointmentEntity = Appointment.create(
          business.id,
          service.id,
          UserId.fromString(clientUser.id),
          slot,
        );

        const data = this.appointmentAssembler.toData(appointmentEntity);

        return tx.appointment.create({ data });
      });

      const appointment = this.appointmentAssembler.toDomain(appointmentRecord);
      return AppointmentDTOAssembler.toDTO(appointment);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        (error.meta?.target as string[]).includes("serviceId_startsAt")
      ) {
        throw new SchedulingError("SCHEDULING_SLOT_TAKEN", "Requested slot already booked");
      }
      throw error;
    }
  }
}
