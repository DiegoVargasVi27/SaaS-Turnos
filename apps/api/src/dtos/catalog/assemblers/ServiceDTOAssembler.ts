import { Service } from "../../../domain/catalog/entities/service/Service";
import { ServiceDTO } from "../ServiceDTO";

/**
 * Service DTO Assembler.
 * Converts domain Service entity to ServiceDTO for API responses.
 */
export class ServiceDTOAssembler {
  /**
   * Convert domain Service to DTO.
   * @param service - Domain Service entity
   * @returns ServiceDTO for API response
   */
  static toDTO(service: Service): ServiceDTO {
    return new ServiceDTO(
      service.id.value,
      service.businessId.value,
      service.name.value,
      service.duration.minutes,
      service.price.amountCents,
      service.price.currency,
      service.isActive,
      service.createdAt.toISOString()
    );
  }
}
