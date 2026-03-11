import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { CreateServiceDTO } from "../../dtos/catalog/CreateServiceDTO";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";
import { ServiceDTOAssembler } from "../../dtos/catalog/assemblers/ServiceDTOAssembler";

/**
 * Create Service Application Service.
 * Use case: Create a new service for a business.
 * 
 * Responsibilities:
 * - Orchestrate the creation workflow
 * - Delegate business logic to domain entities
 * - Return DTOs (never domain entities)
 */
export class CreateServiceService {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(businessId: string, dto: CreateServiceDTO): Promise<ServiceDTO> {
    // Create domain entity (validations happen in factory method and VOs)
    const service = Service.create(
      BusinessId.fromString(businessId),
      dto.name,
      dto.durationMin,
      dto.priceCents,
      dto.currency
    );

    // Save via repository
    const saved = await this.serviceRepository.save(service);

    // Return DTO (decouple domain from API)
    return ServiceDTOAssembler.toDTO(saved);
  }
}
