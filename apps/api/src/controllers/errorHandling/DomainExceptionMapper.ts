import { Response } from "express";
import { sendError } from "../../lib/http";
import { ServiceNotFoundException } from "../../domain/catalog/exceptions/ServiceNotFoundException";
import { ServiceInactiveException } from "../../domain/catalog/exceptions/ServiceInactiveException";
import { ServiceHasFutureAppointmentsException } from "../../domain/catalog/exceptions/ServiceHasFutureAppointmentsException";

/**
 * Domain Exception Mapper.
 * Maps domain exceptions to HTTP status codes and error responses.
 * 
 * Why centralized mapping?
 * - Consistent error handling across all controllers
 * - Domain layer stays HTTP-agnostic
 * - Easy to maintain and extend
 */
export class DomainExceptionMapper {
  static handle(error: Error, res: Response): void {
    // Service not found → 404
    if (error instanceof ServiceNotFoundException) {
      sendError(res, 404, "SERVICE_NOT_FOUND", error.message);
      return;
    }

    // Service inactive (business rule violation) → 422
    if (error instanceof ServiceInactiveException) {
      sendError(res, 422, "SERVICE_INACTIVE", error.message);
      return;
    }

    // Service has future appointments (conflict) → 409
    if (error instanceof ServiceHasFutureAppointmentsException) {
      sendError(res, 409, "SERVICE_HAS_FUTURE_APPOINTMENTS", error.message);
      return;
    }

    // Value Object validation errors → 400
    if (
      error.message.includes("must be") ||
      error.message.includes("cannot") ||
      error.message.includes("Invalid")
    ) {
      sendError(res, 400, "VALIDATION_ERROR", error.message);
      return;
    }

    // Unknown error → 500
    console.error("Unhandled error in DomainExceptionMapper:", error);
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
}
