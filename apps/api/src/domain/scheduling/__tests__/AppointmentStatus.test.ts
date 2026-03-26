import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "../entities/appointment/AppointmentStatus";

describe("AppointmentStatus", () => {
  describe("factory methods", () => {
    it("pending() creates PENDING status", () => {
      expect(AppointmentStatus.pending().value).toBe("PENDING");
    });

    it("confirmed() creates CONFIRMED status", () => {
      expect(AppointmentStatus.confirmed().value).toBe("CONFIRMED");
    });

    it("cancelled() creates CANCELLED status", () => {
      expect(AppointmentStatus.cancelled().value).toBe("CANCELLED");
    });

    it("completed() creates COMPLETED status", () => {
      expect(AppointmentStatus.completed().value).toBe("COMPLETED");
    });

    it("noShow() creates NO_SHOW status", () => {
      expect(AppointmentStatus.noShow().value).toBe("NO_SHOW");
    });

    it("fromString() creates status from valid string", () => {
      expect(AppointmentStatus.fromString("PENDING").value).toBe("PENDING");
      expect(AppointmentStatus.fromString("CONFIRMED").value).toBe("CONFIRMED");
    });

    it("fromString() throws for invalid status", () => {
      expect(() => AppointmentStatus.fromString("INVALID")).toThrow("Invalid appointment status");
    });
  });

  describe("canTransitionTo()", () => {
    it("PENDING can transition to CONFIRMED", () => {
      expect(AppointmentStatus.pending().canTransitionTo("CONFIRMED")).toBe(true);
    });

    it("PENDING can transition to CANCELLED", () => {
      expect(AppointmentStatus.pending().canTransitionTo("CANCELLED")).toBe(true);
    });

    it("PENDING cannot transition to COMPLETED", () => {
      expect(AppointmentStatus.pending().canTransitionTo("COMPLETED")).toBe(false);
    });

    it("PENDING cannot transition to NO_SHOW", () => {
      expect(AppointmentStatus.pending().canTransitionTo("NO_SHOW")).toBe(false);
    });

    it("CONFIRMED can transition to COMPLETED", () => {
      expect(AppointmentStatus.confirmed().canTransitionTo("COMPLETED")).toBe(true);
    });

    it("CONFIRMED can transition to CANCELLED", () => {
      expect(AppointmentStatus.confirmed().canTransitionTo("CANCELLED")).toBe(true);
    });

    it("CONFIRMED can transition to NO_SHOW", () => {
      expect(AppointmentStatus.confirmed().canTransitionTo("NO_SHOW")).toBe(true);
    });

    it("CONFIRMED cannot transition to PENDING", () => {
      expect(AppointmentStatus.confirmed().canTransitionTo("PENDING")).toBe(false);
    });

    it("CANCELLED is a terminal state — no transitions allowed", () => {
      const cancelled = AppointmentStatus.cancelled();
      expect(cancelled.canTransitionTo("PENDING")).toBe(false);
      expect(cancelled.canTransitionTo("CONFIRMED")).toBe(false);
      expect(cancelled.canTransitionTo("COMPLETED")).toBe(false);
    });

    it("COMPLETED is a terminal state — no transitions allowed", () => {
      const completed = AppointmentStatus.completed();
      expect(completed.canTransitionTo("PENDING")).toBe(false);
      expect(completed.canTransitionTo("CONFIRMED")).toBe(false);
      expect(completed.canTransitionTo("CANCELLED")).toBe(false);
    });

    it("NO_SHOW is a terminal state — no transitions allowed", () => {
      const noShow = AppointmentStatus.noShow();
      expect(noShow.canTransitionTo("PENDING")).toBe(false);
      expect(noShow.canTransitionTo("CONFIRMED")).toBe(false);
      expect(noShow.canTransitionTo("CANCELLED")).toBe(false);
    });
  });

  describe("isActive()", () => {
    it("PENDING is active (blocks time slots)", () => {
      expect(AppointmentStatus.pending().isActive()).toBe(true);
    });

    it("CONFIRMED is active (blocks time slots)", () => {
      expect(AppointmentStatus.confirmed().isActive()).toBe(true);
    });

    it("CANCELLED is not active", () => {
      expect(AppointmentStatus.cancelled().isActive()).toBe(false);
    });

    it("COMPLETED is not active", () => {
      expect(AppointmentStatus.completed().isActive()).toBe(false);
    });

    it("NO_SHOW is not active", () => {
      expect(AppointmentStatus.noShow().isActive()).toBe(false);
    });
  });

  describe("isTerminal()", () => {
    it("CANCELLED is terminal", () => {
      expect(AppointmentStatus.cancelled().isTerminal()).toBe(true);
    });

    it("COMPLETED is terminal", () => {
      expect(AppointmentStatus.completed().isTerminal()).toBe(true);
    });

    it("NO_SHOW is terminal", () => {
      expect(AppointmentStatus.noShow().isTerminal()).toBe(true);
    });

    it("PENDING is not terminal", () => {
      expect(AppointmentStatus.pending().isTerminal()).toBe(false);
    });

    it("CONFIRMED is not terminal", () => {
      expect(AppointmentStatus.confirmed().isTerminal()).toBe(false);
    });
  });

  describe("canBeCancelled()", () => {
    it("PENDING can be cancelled", () => {
      expect(AppointmentStatus.pending().canBeCancelled()).toBe(true);
    });

    it("CONFIRMED can be cancelled", () => {
      expect(AppointmentStatus.confirmed().canBeCancelled()).toBe(true);
    });

    it("CANCELLED cannot be cancelled again", () => {
      expect(AppointmentStatus.cancelled().canBeCancelled()).toBe(false);
    });

    it("COMPLETED cannot be cancelled", () => {
      expect(AppointmentStatus.completed().canBeCancelled()).toBe(false);
    });

    it("NO_SHOW cannot be cancelled", () => {
      expect(AppointmentStatus.noShow().canBeCancelled()).toBe(false);
    });
  });

  describe("equals()", () => {
    it("same status values are equal", () => {
      expect(AppointmentStatus.pending().equals(AppointmentStatus.pending())).toBe(true);
    });

    it("different status values are not equal", () => {
      expect(AppointmentStatus.pending().equals(AppointmentStatus.confirmed())).toBe(false);
    });
  });
});
