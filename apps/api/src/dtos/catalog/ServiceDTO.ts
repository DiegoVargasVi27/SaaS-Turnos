/**
 * Service Data Transfer Object.
 * Represents a service in API responses.
 * Immutable - only constructor and getters.
 */
export class ServiceDTO {
  constructor(
    public readonly id: string,
    public readonly businessId: string,
    public readonly name: string,
    public readonly durationMin: number,
    public readonly priceCents: number,
    public readonly currency: string,
    public readonly isActive: boolean,
    public readonly createdAt: string
  ) {}
}
