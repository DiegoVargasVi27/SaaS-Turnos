import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";
import { ServiceDTOAssembler } from "../../dtos/catalog/assemblers/ServiceDTOAssembler";
import { CatalogError } from "./CatalogError";

export interface UpdateServiceCommand {
  serviceId: string;
  businessId: string;
  name?: string;
  durationMinutes?: number;
  priceCents?: number;
  currency?: string;
}

export class UpdateService {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(command: UpdateServiceCommand): Promise<ServiceDTO> {
    const serviceId = ServiceId.fromString(command.serviceId);
    const service = await this.serviceRepo.findById(serviceId);

    if (!service) {
      throw new CatalogError(
        "CATALOG_SERVICE_NOT_FOUND",
        `Service ${command.serviceId} not found`,
      );
    }

    // Apply partial updates via domain methods (each validates through VOs)
    if (command.name !== undefined) {
      service.updateName(command.name);
    }

    if (command.durationMinutes !== undefined) {
      service.updateDuration(command.durationMinutes);
    }

    if (command.priceCents !== undefined) {
      service.updatePrice(command.priceCents, command.currency);
    }

    await this.serviceRepo.save(service);
    return ServiceDTOAssembler.toDTO(service);
  }
}
