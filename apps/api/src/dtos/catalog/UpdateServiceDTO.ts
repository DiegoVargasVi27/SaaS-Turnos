/**
 * Update Service Input DTO.
 * All fields optional - only provided fields will be updated.
 */
export class UpdateServiceDTO {
  constructor(
    public readonly name?: string,
    public readonly durationMin?: number,
    public readonly priceCents?: number,
    public readonly currency?: string,
    public readonly isActive?: boolean
  ) {}
}
