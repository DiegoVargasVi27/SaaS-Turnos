import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { CatalogError } from "./CatalogError";

export interface DeleteServiceCommand {
  serviceId: string;
  businessId: string;
}

export class DeleteService {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(command: DeleteServiceCommand): Promise<void> {
    const serviceId = ServiceId.fromString(command.serviceId);
    const service = await this.serviceRepo.findById(serviceId);

    if (!service) {
      throw new CatalogError(
        "CATALOG_SERVICE_NOT_FOUND",
        `Service ${command.serviceId} not found`,
      );
    }

    // Business rule: cannot deactivate a service with future appointments
    const hasFutureAppointments = await this.serviceRepo.hasFutureAppointments(serviceId);
    if (hasFutureAppointments) {
      throw new CatalogError(
        "CATALOG_SERVICE_HAS_APPOINTMENTS",
        `Cannot deactivate service ${command.serviceId}: it has future appointments scheduled`,
      );
    }

    // Soft delete: deactivate instead of removing from database
    service.deactivate();
    await this.serviceRepo.save(service);
  }
}
