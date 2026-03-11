import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { SlotGenerationService } from "../../domain/scheduling/services/SlotGenerationService";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { WeekDay } from "../../domain/scheduling/entities/availability/WeekDay";
import { SlotDTO } from "../../dtos/scheduling/SlotDTO";
import { SlotDTOAssembler } from "../../dtos/scheduling/assemblers/SlotDTOAssembler";
import { ServiceNotFoundException } from "../../domain/catalog/exceptions/ServiceNotFoundException";
import { ServiceInactiveException } from "../../domain/catalog/exceptions/ServiceInactiveException";

/**
 * Get Available Slots Application Service.
 * Use case: Get all available time slots for a service on a specific date.
 * 
 * Workflow:
 * 1. Validate service exists and is active
 * 2. Get availability rules for the business on the target weekday
 * 3. Get existing active appointments for the target date
 * 4. Use domain service to generate available slots
 * 5. Return DTOs
 */
export class GetAvailableSlotsService {
  private slotGenerationService = new SlotGenerationService();

  constructor(
    private readonly availabilityRuleRepository: IAvailabilityRuleRepository,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly serviceRepository: IServiceRepository
  ) {}

  async execute(
    businessId: string,
    serviceId: string,
    targetDate: Date
  ): Promise<SlotDTO[]> {
    const businessIdVO = BusinessId.fromString(businessId);
    const serviceIdVO = ServiceId.fromString(serviceId);

    // Step 1: Validate service
    const service = await this.serviceRepository.findById(serviceIdVO);
    if (!service) {
      throw new ServiceNotFoundException(serviceId);
    }
    if (!service.isActive) {
      throw new ServiceInactiveException(serviceId);
    }

    // Step 2: Get availability rules for this weekday
    const weekDay = WeekDay.fromDate(targetDate);
    const availabilityRules = await this.availabilityRuleRepository.findActiveByBusinessAndWeekday(
      businessIdVO,
      weekDay.value
    );

    // No availability rules = no slots
    if (availabilityRules.length === 0) {
      return [];
    }

    // Step 3: Get existing appointments for this date
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await this.appointmentRepository.findActiveByBusinessAndDateRange(
      businessIdVO,
      startOfDay,
      endOfDay
    );

    // Step 4: Generate available slots (domain logic)
    const availableSlots = this.slotGenerationService.generateAvailableSlots(
      availabilityRules,
      targetDate,
      service.duration.minutes,
      existingAppointments
    );

    // Step 5: Convert to DTOs
    return SlotDTOAssembler.toDTOList(availableSlots);
  }
}
