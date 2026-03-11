import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { ServiceNotFoundException } from "../../domain/catalog/exceptions/ServiceNotFoundException";
import { ServiceHasFutureAppointmentsException } from "../../domain/catalog/exceptions/ServiceHasFutureAppointmentsException";

/**
 * Delete Service Application Service.
 * Use case: Soft-delete a service (set isActive = false).
 * 
 * Business rule: Cannot delete services with future appointments.
 */
export class DeleteServiceService {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(serviceId: string): Promise<void> {
    const id = ServiceId.fromString(serviceId);

    // Check service exists
    const exists = await this.serviceRepository.exists(id);
    if (!exists) {
      throw new ServiceNotFoundException(serviceId);
    }

    // Business rule: prevent deletion if service has future appointments
    const hasFutureAppointments = await this.serviceRepository.hasFutureAppointments(id);
    if (hasFutureAppointments) {
      throw new ServiceHasFutureAppointmentsException(serviceId);
    }

    // Soft delete (sets isActive = false)
    await this.serviceRepository.delete(id);
  }
}
