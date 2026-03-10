/**
 * Create Service Input DTO.
 * Used when creating a new service.
 */
export class CreateServiceDTO {
  constructor(
    public readonly name: string,
    public readonly durationMin: number,
    public readonly priceCents: number,
    public readonly currency?: string
  ) {}
}
