import { ValueObject } from "../../../shared/interfaces/ValueObject";
import { AppointmentStatus as PrismaStatus } from "@prisma/client";

/**
 * AppointmentStatus value object.
 * Encapsulates appointment lifecycle states and valid transitions.
 * Immutable.
 * 
 * Valid transitions:
 * - PENDING → CONFIRMED, CANCELLED
 * - CONFIRMED → COMPLETED, CANCELLED, NO_SHOW
 * - CANCELLED → (no transitions, terminal state)
 * - COMPLETED → (no transitions, terminal state)
 * - NO_SHOW → (no transitions, terminal state)
 */
export class AppointmentStatus implements ValueObject {
  private constructor(private readonly _value: PrismaStatus) {}

  // Factory methods for each status
  static pending(): AppointmentStatus {
    return new AppointmentStatus("PENDING");
  }

  static confirmed(): AppointmentStatus {
    return new AppointmentStatus("CONFIRMED");
  }

  static cancelled(): AppointmentStatus {
    return new AppointmentStatus("CANCELLED");
  }

  static completed(): AppointmentStatus {
    return new AppointmentStatus("COMPLETED");
  }

  static noShow(): AppointmentStatus {
    return new AppointmentStatus("NO_SHOW");
  }

  /**
   * Reconstitute from string (for loading from database).
   */
  static fromString(value: string): AppointmentStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid appointment status: ${value}`);
    }
    return new AppointmentStatus(value as PrismaStatus);
  }

  private static isValid(value: string): value is PrismaStatus {
    return ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(value);
  }

  get value(): PrismaStatus {
    return this._value;
  }

  /**
   * Check if this status can transition to another status.
   * Business rule: enforce valid state transitions.
   */
  canTransitionTo(target: PrismaStatus): boolean {
    const transitions: Record<PrismaStatus, PrismaStatus[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
      CANCELLED: [], // Terminal state
      COMPLETED: [], // Terminal state
      NO_SHOW: [],   // Terminal state
    };

    return transitions[this._value].includes(target);
  }

  /**
   * Check if appointment can be cancelled from this status.
   */
  canBeCancelled(): boolean {
    return this._value === "PENDING" || this._value === "CONFIRMED";
  }

  /**
   * Check if this is a terminal status (no further transitions allowed).
   */
  isTerminal(): boolean {
    return ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(this._value);
  }

  /**
   * Check if this status counts as an "active" appointment for overlap checking.
   * PENDING and CONFIRMED appointments block time slots.
   */
  isActive(): boolean {
    return this._value === "PENDING" || this._value === "CONFIRMED";
  }

  equals(other: AppointmentStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
