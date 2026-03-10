/**
 * Exception thrown when a service cannot be found by its ID.
 * Maps to HTTP 404 Not Found.
 */
export class ServiceNotFoundException extends Error {
  constructor(serviceId: string) {
    super(`Service with id ${serviceId} not found`);
    this.name = "ServiceNotFoundException";
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceNotFoundException);
    }
  }
}
