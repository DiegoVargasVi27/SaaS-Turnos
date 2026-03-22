import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { WeekDay } from "../../domain/scheduling/entities/availability/WeekDay";
import { Appointment } from "../../domain/scheduling/entities/appointment/Appointment";
import { TimeSlot } from "../../domain/scheduling/entities/appointment/TimeSlot";
import { SchedulingService } from "../../domain/scheduling/services/SchedulingService";
import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { SlotOutsideAvailabilityException } from "../../domain/scheduling/exceptions/SlotOutsideAvailabilityException";
import { AppointmentOverlapException } from "../../domain/scheduling/exceptions/AppointmentOverlapException";
import { GuestUserRegistrar } from "../../domain/scheduling/ports/GuestUserRegistrar";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";
import { CatalogError } from "../catalog/CatalogError";
import { SchedulingError } from "./SchedulingError";

export interface BookAppointmentCommand {
  businessSlug: string;
  serviceId: string;
  startsAt: Date;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
}

export class BookAppointment {
  constructor(
    private readonly catalogRepo: IServiceRepository,
    private readonly availabilityRepo: IAvailabilityRuleRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly schedulingService: SchedulingService,
    private readonly guestUserRegistrar: GuestUserRegistrar,
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

    // Delegate guest user creation/lookup to the ACL port
    const clientUserId = await this.guestUserRegistrar.ensureGuestUser(
      business.id,
      {
        email: command.clientEmail,
        fullName: command.clientName,
        phone: command.clientPhone,
      },
    );

    const appointment = Appointment.create(
      business.id,
      service.id,
      clientUserId,
      slot,
    );

    await this.appointmentRepo.save(appointment);
    return AppointmentDTOAssembler.toDTO(appointment);
  }
}
