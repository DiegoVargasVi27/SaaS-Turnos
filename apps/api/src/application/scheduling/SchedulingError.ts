export type SchedulingErrorCode =
  | "SCHEDULING_SLOT_TAKEN"
  | "SCHEDULING_SERVICE_INACTIVE"
  | "SCHEDULING_BUSINESS_NOT_FOUND"
  | "SCHEDULING_APPOINTMENT_NOT_FOUND"
  | "SCHEDULING_APPOINTMENT_NOT_CANCELLABLE"
  | "SCHEDULING_INVALID_AVAILABILITY_DATA"
  | "SCHEDULING_AVAILABILITY_RULE_NOT_FOUND";

export class SchedulingError extends Error {
  constructor(public readonly code: SchedulingErrorCode, message: string) {
    super(message);
  }
}
