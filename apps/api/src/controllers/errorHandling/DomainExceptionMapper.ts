import { Response } from "express";
import { sendError } from "../../lib/http";
import { ServiceNotFoundException } from "../../domain/catalog/exceptions/ServiceNotFoundException";
import { ServiceInactiveException } from "../../domain/catalog/exceptions/ServiceInactiveException";
import { ServiceHasFutureAppointmentsException } from "../../domain/catalog/exceptions/ServiceHasFutureAppointmentsException";
import { AppointmentNotFoundException } from "../../domain/scheduling/exceptions/AppointmentNotFoundException";
import { AppointmentOverlapException } from "../../domain/scheduling/exceptions/AppointmentOverlapException";
import { SlotOutsideAvailabilityException } from "../../domain/scheduling/exceptions/SlotOutsideAvailabilityException";
import { PastAppointmentException } from "../../domain/scheduling/exceptions/PastAppointmentException";
import { InvalidStatusTransitionException } from "../../domain/scheduling/exceptions/InvalidStatusTransitionException";
import { AppointmentCrossesDayBoundaryException } from "../../domain/scheduling/exceptions/AppointmentCrossesDayBoundaryException";

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

    // Appointment not found → 404
    if (error instanceof AppointmentNotFoundException) {
      sendError(res, 404, "APPOINTMENT_NOT_FOUND", error.message);
      return;
    }

    // Appointment overlap (conflict) → 409
    if (error instanceof AppointmentOverlapException) {
      sendError(res, 409, "APPOINTMENT_OVERLAP", error.message);
      return;
    }

    // Slot outside availability (business rule violation) → 422
    if (error instanceof SlotOutsideAvailabilityException) {
      sendError(res, 422, "SLOT_OUTSIDE_AVAILABILITY", error.message);
      return;
    }

    // Past appointment (business rule violation) → 422
    if (error instanceof PastAppointmentException) {
      sendError(res, 422, "PAST_APPOINTMENT", error.message);
      return;
    }

    // Invalid status transition (business rule violation) → 422
    if (error instanceof InvalidStatusTransitionException) {
      sendError(res, 422, "INVALID_STATUS_TRANSITION", error.message);
      return;
    }

    // Appointment crosses day boundary (business rule violation) → 422
    if (error instanceof AppointmentCrossesDayBoundaryException) {
      sendError(res, 422, "APPOINTMENT_CROSSES_DAY_BOUNDARY", error.message);
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
