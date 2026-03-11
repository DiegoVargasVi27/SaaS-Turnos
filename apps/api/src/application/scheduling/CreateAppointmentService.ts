import { prisma } from "../../lib/prisma";
import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { AppointmentBookingService } from "../../domain/scheduling/services/AppointmentBookingService";
import { Appointment } from "../../domain/scheduling/entities/appointment/Appointment";
import { TimeSlot } from "../../domain/scheduling/entities/appointment/TimeSlot";
import { WeekDay } from "../../domain/scheduling/entities/availability/WeekDay";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { UserId } from "../../domain/shared/types/UserId";
import { CreateAppointmentDTO } from "../../dtos/scheduling/CreateAppointmentDTO";
import { AppointmentDTO } from "../../dtos/scheduling/AppointmentDTO";
import { AppointmentDTOAssembler } from "../../dtos/scheduling/assemblers/AppointmentDTOAssembler";
import { ServiceNotFoundException } from "../../domain/catalog/exceptions/ServiceNotFoundException";
import { ServiceInactiveException } from "../../domain/catalog/exceptions/ServiceInactiveException";
import { Role } from "@prisma/client";
import { hashPassword } from "../../lib/auth";

/**
 * Create Appointment Application Service.
 * Use case: Book a new appointment for a client.
 * 
 * Workflow:
 * 1. Validate service exists and is active
 * 2. Create time slot from request
 * 3. Get availability rules and existing appointments
 * 4. Validate booking using domain service
 * 5. Upsert client user (if email exists, update; else create)
 * 6. Link client to business
 * 7. Create appointment
 * 8. Save all in a transaction
 * 9. Return DTO
 * 
 * Note: Transaction boundary includes user creation (pragmatic approach for this use case).
 */
export class CreateAppointmentService {
  private bookingService = new AppointmentBookingService();

  constructor(
    private readonly availabilityRuleRepository: IAvailabilityRuleRepository,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly serviceRepository: IServiceRepository
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<AppointmentDTO> {
    // Step 1: Resolve business by slug
    const business = await prisma.business.findUnique({
      where: { slug: dto.businessSlug },
    });
    if (!business) {
      throw new Error(`Business with slug ${dto.businessSlug} not found`);
    }

    const businessId = BusinessId.fromString(business.id);
    const serviceId = ServiceId.fromString(dto.serviceId);

    // Step 2: Validate service
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new ServiceNotFoundException(dto.serviceId);
    }
    if (!service.isActive) {
      throw new ServiceInactiveException(dto.serviceId);
    }

    // Step 3: Create time slot
    const timeSlot = TimeSlot.fromDuration(dto.startsAt, service.duration.minutes);

    // Step 4: Get availability rules for this weekday
    const weekDay = WeekDay.fromDate(dto.startsAt);
    const availabilityRules = await this.availabilityRuleRepository.findActiveByBusinessAndWeekday(
      businessId,
      weekDay.value
    );

    // Step 5: Get existing appointments for overlap check
    const startOfDay = new Date(dto.startsAt);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dto.startsAt);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await this.appointmentRepository.findActiveByBusinessAndDateRange(
      businessId,
      startOfDay,
      endOfDay
    );

    // Step 6: Validate booking (domain logic)
    this.bookingService.validateBooking(timeSlot, availabilityRules, existingAppointments);

    // Step 7-9: Transaction for user upsert + appointment creation
    const fallbackPassword = await hashPassword(`client-${Date.now()}-${Math.random()}`);

    const result = await prisma.$transaction(async (tx) => {
      // Upsert user
      const clientUser = await tx.user.upsert({
        where: { email: dto.clientEmail },
        update: {
          fullName: dto.clientName,
          phone: dto.clientPhone,
        },
        create: {
          email: dto.clientEmail,
          fullName: dto.clientName,
          phone: dto.clientPhone,
          passwordHash: fallbackPassword,
        },
      });

      const clientUserId = UserId.fromString(clientUser.id);

      // Link user to business (if not already linked)
      await tx.businessUser.upsert({
        where: {
          businessId_userId: {
            businessId: business.id,
            userId: clientUser.id,
          },
        },
        update: {},
        create: {
          businessId: business.id,
          userId: clientUser.id,
          role: Role.CLIENT,
        },
      });

      // Create appointment (domain entity)
      const appointment = Appointment.create(businessId, serviceId, clientUserId, timeSlot);

      // Save appointment
      await this.appointmentRepository.save(appointment);

      return appointment;
    });

    // Step 10: Return DTO
    return AppointmentDTOAssembler.toDTO(result);
  }
}
