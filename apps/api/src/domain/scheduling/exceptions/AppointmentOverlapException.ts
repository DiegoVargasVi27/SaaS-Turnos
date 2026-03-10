export class AppointmentOverlapException extends Error {
  constructor() {
    super("Selected slot overlaps with an existing appointment");
    this.name = "AppointmentOverlapException";
  }
}
