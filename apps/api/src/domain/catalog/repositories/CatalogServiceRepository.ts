import { BusinessId } from "../../shared/types/BusinessId";
import { ServiceId } from "../../shared/types/ServiceId";
import { Service } from "../entities/service/Service";

export interface CatalogBusinessSummary {
  id: BusinessId;
  slug: string;
  name: string;
  timezone: string;
}

export interface CatalogServiceRepository {
  /**
   * Resolve a business by its public slug.
   */
  findBusinessBySlug(slug: string): Promise<CatalogBusinessSummary | null>;

  /**
   * List all active services for a business.
   */
  listActiveByBusinessId(businessId: BusinessId): Promise<Service[]>;

  /**
   * Find an active service by id regardless of business context.
   */
  findActiveById(serviceId: ServiceId): Promise<Service | null>;
}
