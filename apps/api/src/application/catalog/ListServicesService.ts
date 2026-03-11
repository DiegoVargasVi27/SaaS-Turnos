import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";
import { ServiceDTOAssembler } from "../../dtos/catalog/assemblers/ServiceDTOAssembler";

/**
 * List Services Application Service.
 * Use case: Get all services for a business (optionally filtered by active status).
 */
export class ListServicesService {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(businessId: string, activeOnly: boolean = false): Promise<ServiceDTO[]> {
    const bid = BusinessId.fromString(businessId);

    // Load services from repository
    const services = activeOnly
      ? await this.serviceRepository.findActiveByBusinessId(bid)
      : await this.serviceRepository.findByBusinessId(bid);

    // Map to DTOs
    return services.map((s) => ServiceDTOAssembler.toDTO(s));
  }
}
