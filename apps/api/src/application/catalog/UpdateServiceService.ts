import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { UpdateServiceDTO } from "../../dtos/catalog/UpdateServiceDTO";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";
import { ServiceDTOAssembler } from "../../dtos/catalog/assemblers/ServiceDTOAssembler";
import { ServiceNotFoundException } from "../../domain/catalog/exceptions/ServiceNotFoundException";

/**
 * Update Service Application Service.
 * Use case: Update an existing service's properties.
 */
export class UpdateServiceService {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(serviceId: string, dto: UpdateServiceDTO): Promise<ServiceDTO> {
    const id = ServiceId.fromString(serviceId);

    // Load existing service
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundException(serviceId);
    }

    // Apply changes (business methods on entity)
    if (dto.name !== undefined) {
      service.updateName(dto.name);
    }
    if (dto.durationMin !== undefined) {
      service.updateDuration(dto.durationMin);
    }
    if (dto.priceCents !== undefined) {
      service.updatePrice(dto.priceCents, dto.currency);
    }
    if (dto.isActive !== undefined) {
      dto.isActive ? service.activate() : service.deactivate();
    }

    // Save changes
    const updated = await this.serviceRepository.save(service);

    return ServiceDTOAssembler.toDTO(updated);
  }
}
