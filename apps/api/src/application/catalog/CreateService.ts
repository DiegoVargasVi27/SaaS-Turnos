import { IServiceRepository } from "../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../domain/shared/types/BusinessId";
import { ServiceDTO } from "../../dtos/catalog/ServiceDTO";
import { ServiceDTOAssembler } from "../../dtos/catalog/assemblers/ServiceDTOAssembler";

export interface CreateServiceCommand {
  businessId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  currency?: string;
}

export class CreateService {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(command: CreateServiceCommand): Promise<ServiceDTO> {
    const businessId = BusinessId.fromString(command.businessId);

    // Domain validation happens inside Service.create() via value objects
    const service = Service.create(
      businessId,
      command.name,
      command.durationMinutes,
      command.priceCents,
      command.currency,
    );

    await this.serviceRepo.save(service);
    return ServiceDTOAssembler.toDTO(service);
  }
}
