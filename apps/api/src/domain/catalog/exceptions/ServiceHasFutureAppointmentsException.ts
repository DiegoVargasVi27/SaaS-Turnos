/**
 * Exception thrown when attempting to delete a service that has future appointments.
 * Business rule: cannot delete services with pending or confirmed future appointments.
 * Maps to HTTP 409 Conflict.
 */
export class ServiceHasFutureAppointmentsException extends Error {
  constructor(serviceId: string) {
    super(
      `Cannot delete service ${serviceId}: it has future appointments scheduled. ` +
      `Deactivate the service instead to prevent new bookings.`
    );
    this.name = "ServiceHasFutureAppointmentsException";
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceHasFutureAppointmentsException);
    }
  }
}
