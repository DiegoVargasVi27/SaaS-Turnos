import { Service } from "../../../domain/catalog/entities/service/Service";
import { TimeSlot } from "../../../domain/scheduling/entities/appointment/TimeSlot";
import { CatalogServicePublicDTO } from "../CatalogServicePublicDTO";
import { AvailabilitySlotAssembler } from "../../scheduling/assemblers/AvailabilitySlotAssembler";

export class CatalogServicePublicAssembler {
  static toDTO(service: Service, slots?: TimeSlot[]): CatalogServicePublicDTO {
    return {
      id: service.id.value,
      name: service.name.value,
      durationMin: service.duration.minutes,
      priceCents: service.price.amountCents,
      currency: service.price.currency,
      availability: slots?.map((slot) => AvailabilitySlotAssembler.toDTO(slot)),
    };
  }
}
