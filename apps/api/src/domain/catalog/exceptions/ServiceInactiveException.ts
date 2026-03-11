/**
 * Exception thrown when attempting to use an inactive service.
 * Business rule: inactive services cannot be booked.
 * Maps to HTTP 422 Unprocessable Entity.
 */
export class ServiceInactiveException extends Error {
  constructor(serviceId: string) {
    super(`Service ${serviceId} is inactive and cannot be used for bookings`);
    this.name = "ServiceInactiveException";
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceInactiveException);
    }
  }
}
