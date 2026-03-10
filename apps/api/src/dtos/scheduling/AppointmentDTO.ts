/**
 * Appointment Data Transfer Object.
 * Represents an appointment in API responses.
 */
export class AppointmentDTO {
  constructor(
    public readonly id: string,
    public readonly businessId: string,
    public readonly serviceId: string,
    public readonly clientUserId: string,
    public readonly startsAt: string,
    public readonly endsAt: string,
    public readonly status: string,
    public readonly createdAt: string
  ) {}
}
