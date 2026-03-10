/**
 * Create Appointment Request DTO.
 * Input for creating a new appointment.
 */
export class CreateAppointmentDTO {
  constructor(
    public readonly businessSlug: string,
    public readonly serviceId: string,
    public readonly startsAt: Date,
    public readonly clientEmail: string,
    public readonly clientName: string,
    public readonly clientPhone: string
  ) {}
}
