import { AvailabilitySlotDTO } from "../scheduling/AvailabilitySlotDTO";

export interface CatalogServicePublicDTO {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  currency: string;
  availability?: AvailabilitySlotDTO[];
}
