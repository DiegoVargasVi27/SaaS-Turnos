import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";
import { ServiceDTOAssembler } from "../../dtos/catalog/assemblers/ServiceDTOAssembler";

export interface ListServicesQuery {
  businessId: string;
  includeInactive?: boolean;
}

export class ListServices {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(query: ListServicesQuery): Promise<ServiceDTO[]> {
    const businessId = BusinessId.fromString(query.businessId);

    const services = query.includeInactive
      ? await this.serviceRepo.findByBusinessId(businessId)
      : await this.serviceRepo.findActiveByBusinessId(businessId);

    return services.map(ServiceDTOAssembler.toDTO);
  }
}
