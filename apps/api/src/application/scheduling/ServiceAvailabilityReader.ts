import { Service } from "../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { WeekDay } from "../../domain/scheduling/entities/availability/WeekDay";
import { TimeSlot } from "../../domain/scheduling/entities/appointment/TimeSlot";
import { IAvailabilityRuleRepository } from "../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { IAppointmentRepository } from "../../domain/scheduling/repositories/IAppointmentRepository";
import { SchedulingService } from "../../domain/scheduling/services/SchedulingService";

export interface ServiceAvailabilityQuery {
  businessId: BusinessId;
  service: Service;
  targetDate: Date;
}

export class ServiceAvailabilityReader {
  constructor(
    private readonly availabilityRepo: IAvailabilityRuleRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly schedulingService: SchedulingService,
  ) {}

  async execute(query: ServiceAvailabilityQuery): Promise<TimeSlot[]> {
    const { businessId, service, targetDate } = query;
    const weekDay = WeekDay.fromDate(targetDate);

    const availabilityRules = await this.availabilityRepo.findActiveByBusinessAndWeekday(
      businessId,
      weekDay.value,
    );

    const dayStart = new Date(targetDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await this.appointmentRepo.findActiveByBusinessAndDateRange(
      businessId,
      dayStart,
      dayEnd,
    );

    return this.schedulingService.generateAvailability(
      availabilityRules,
      targetDate,
      service.duration.minutes,
      existingAppointments,
    );
  }
}
