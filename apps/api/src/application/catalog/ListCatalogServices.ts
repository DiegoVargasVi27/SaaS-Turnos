import { CatalogServiceRepository } from "../../domain/catalog/repositories/CatalogServiceRepository";
import { CatalogServicePublicDTO } from "../../dtos/catalog/CatalogServicePublicDTO";
import { CatalogServicePublicAssembler } from "../../dtos/catalog/assemblers/CatalogServicePublicAssembler";
import { CatalogError } from "./CatalogError";
import { ServiceAvailabilityReader } from "../scheduling/ServiceAvailabilityReader";

export interface ListCatalogServicesQuery {
  businessSlug: string;
  includeAvailability?: boolean;
  date?: Date;
  slotsPerService?: number;
}

export interface ListCatalogServicesResult {
  business: { id: string; slug: string; name: string };
  services: CatalogServicePublicDTO[];
}

export class ListCatalogServices {
  private readonly clock: () => Date;

  constructor(
    private readonly catalogRepo: CatalogServiceRepository,
    private readonly availabilityReader: ServiceAvailabilityReader,
    clock?: () => Date,
  ) {
    this.clock = clock ?? (() => new Date());
  }

  async execute(query: ListCatalogServicesQuery): Promise<ListCatalogServicesResult> {
    const business = await this.catalogRepo.findBusinessBySlug(query.businessSlug);
    if (!business) {
      throw new CatalogError("CATALOG_BUSINESS_NOT_FOUND", `Business ${query.businessSlug} not found`);
    }

    const services = await this.catalogRepo.listActiveByBusinessId(business.id);
    const includeAvailability = query.includeAvailability ?? false;
    const targetDate = query.date ?? this.clock();
    const slotsPerService = query.slotsPerService ?? 5;

    const serviceDTOs = await Promise.all(
      services.map(async (service) => {
        if (!includeAvailability) {
          return CatalogServicePublicAssembler.toDTO(service);
        }

        const slots = await this.availabilityReader.execute({
          businessId: business.id,
          service,
          targetDate,
        });

        const limitedSlots = slots.slice(0, slotsPerService);
        return CatalogServicePublicAssembler.toDTO(service, limitedSlots);
      }),
    );

    return {
      business: {
        id: business.id.value,
        slug: business.slug,
        name: business.name,
      },
      services: serviceDTOs,
    };
  }
}
