export class PastAppointmentException extends Error {
  constructor() {
    super("Appointment cannot be scheduled in the past");
    this.name = "PastAppointmentException";
  }
}
