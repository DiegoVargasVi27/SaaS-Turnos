import { CatalogServiceRepository } from "../../domain/catalog/repositories/CatalogServiceRepository";
import { ServiceId } from "../../domain/shared/types/ServiceId";
import { CatalogError } from "./CatalogError";
import { ServiceAvailabilityReader } from "../scheduling/ServiceAvailabilityReader";
import { AvailabilitySlotAssembler } from "../../dtos/scheduling/assemblers/AvailabilitySlotAssembler";
import { AvailabilitySlotDTO } from "../../dtos/scheduling/AvailabilitySlotDTO";

export interface GetServiceAvailabilityQuery {
  businessSlug: string;
  serviceId: string;
  date: Date;
}

export interface GetServiceAvailabilityResult {
  business: { id: string; slug: string; name: string };
  service: { id: string; name: string; durationMin: number };
  slots: AvailabilitySlotDTO[];
}

export class GetServiceAvailability {
  constructor(
    private readonly catalogRepo: CatalogServiceRepository,
    private readonly availabilityReader: ServiceAvailabilityReader,
  ) {}

  async execute(query: GetServiceAvailabilityQuery): Promise<GetServiceAvailabilityResult> {
    const business = await this.catalogRepo.findBusinessBySlug(query.businessSlug);
    if (!business) {
      throw new CatalogError("CATALOG_BUSINESS_NOT_FOUND", `Business ${query.businessSlug} not found`);
    }

    const serviceId = ServiceId.fromString(query.serviceId);
    const service = await this.catalogRepo.findActiveById(serviceId);
    if (!service || !service.businessId.equals(business.id)) {
      throw new CatalogError("CATALOG_SERVICE_NOT_FOUND", "Service not found or inactive");
    }

    const slots = await this.availabilityReader.execute({
      businessId: business.id,
      service,
      targetDate: query.date,
    });

    return {
      business: { id: business.id.value, slug: business.slug, name: business.name },
      service: {
        id: service.id.value,
        name: service.name.value,
        durationMin: service.duration.minutes,
      },
      slots: slots.map((slot) => AvailabilitySlotAssembler.toDTO(slot)),
    };
  }
}
