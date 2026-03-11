export class AppointmentNotFoundException extends Error {
  constructor(appointmentId: string) {
    super(`Appointment with id ${appointmentId} not found`);
    this.name = "AppointmentNotFoundException";
  }
}
