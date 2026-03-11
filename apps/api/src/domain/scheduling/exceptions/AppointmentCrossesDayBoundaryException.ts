export class AppointmentCrossesDayBoundaryException extends Error {
  constructor() {
    super("Appointment cannot cross day boundaries");
    this.name = "AppointmentCrossesDayBoundaryException";
  }
}
