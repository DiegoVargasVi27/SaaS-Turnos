import { describe, expect, it } from "vitest";
import { Appointment } from "../entities/appointment/Appointment";
import { AppointmentStatus } from "../entities/appointment/AppointmentStatus";
import { TimeSlot } from "../entities/appointment/TimeSlot";
import { BusinessId } from "../../shared/types/BusinessId";
import { ServiceId } from "../../shared/types/ServiceId";
import { UserId } from "../../shared/types/UserId";
import { AppointmentId } from "../../shared/types/AppointmentId";
import { InvalidStatusTransitionException } from "../exceptions/InvalidStatusTransitionException";
import { PastAppointmentException } from "../exceptions/PastAppointmentException";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";
const CLIENT_ID = "510a9af0-0be2-4764-9fe3-3b9454f3c9b8";
const APT_ID = "11dfe52f-2dce-4dc5-8561-0df4d9d33c07";

function businessId() { return BusinessId.fromString(BIZ_ID); }
function serviceId() { return ServiceId.fromString(SVC_ID); }
function clientId() { return UserId.fromString(CLIENT_ID); }

function futureSlot(minutesFromNow: number = 120, durationMinutes: number = 30): TimeSlot {
  const start = new Date(Date.now() + minutesFromNow * 60_000);
  return TimeSlot.fromDuration(start, durationMinutes);
}

function makeAppointment(statusOverride?: AppointmentStatus): Appointment {
  if (statusOverride) {
    return Appointment.reconstitute(
      AppointmentId.fromString(APT_ID),
      businessId(),
      serviceId(),
      clientId(),
      futureSlot(),
      statusOverride,
      new Date(),
    );
  }
  return Appointment.create(businessId(), serviceId(), clientId(), futureSlot());
}

describe("Appointment", () => {
  describe("create()", () => {
    it("defaults to PENDING status", () => {
      const apt = Appointment.create(businessId(), serviceId(), clientId(), futureSlot());
      expect(apt.status.value).toBe("PENDING");
    });

    it("generates an ID when none provided", () => {
      const apt = Appointment.create(businessId(), serviceId(), clientId(), futureSlot());
      expect(apt.id).toBeDefined();
    });

    it("uses provided ID when given", () => {
      const id = AppointmentId.fromString(APT_ID);
      const apt = Appointment.create(businessId(), serviceId(), clientId(), futureSlot(), id);
      expect(apt.id.value).toBe(APT_ID);
    });

    it("throws PastAppointmentException for past time slot", () => {
      const pastStart = new Date(Date.now() - 2 * 60 * 60_000);
      const pastEnd = new Date(pastStart.getTime() + 30 * 60_000);
      // Past slot — but fromRange allows past dates, only create() enforces future
      const pastSlot = TimeSlot.fromRange(pastStart, pastEnd);
      expect(() =>
        Appointment.create(businessId(), serviceId(), clientId(), pastSlot)
      ).toThrow(PastAppointmentException);
    });

    it("stores all provided fields correctly", () => {
      const slot = futureSlot();
      const apt = Appointment.create(businessId(), serviceId(), clientId(), slot);
      expect(apt.businessId.value).toBe(BIZ_ID);
      expect(apt.serviceId.value).toBe(SVC_ID);
      expect(apt.clientUserId.value).toBe(CLIENT_ID);
      expect(apt.timeSlot).toBe(slot);
    });
  });

  describe("cancel()", () => {
    it("transitions PENDING to CANCELLED", () => {
      const apt = makeAppointment();
      apt.cancel();
      expect(apt.status.value).toBe("CANCELLED");
    });

    it("transitions CONFIRMED to CANCELLED", () => {
      const apt = makeAppointment(AppointmentStatus.confirmed());
      apt.cancel();
      expect(apt.status.value).toBe("CANCELLED");
    });

    it("throws InvalidStatusTransitionException when cancelling a CANCELLED appointment", () => {
      const apt = makeAppointment(AppointmentStatus.cancelled());
      expect(() => apt.cancel()).toThrow(InvalidStatusTransitionException);
    });

    it("throws InvalidStatusTransitionException when cancelling a COMPLETED appointment", () => {
      const apt = makeAppointment(AppointmentStatus.completed());
      expect(() => apt.cancel()).toThrow(InvalidStatusTransitionException);
    });

    it("throws InvalidStatusTransitionException when cancelling a NO_SHOW appointment", () => {
      const apt = makeAppointment(AppointmentStatus.noShow());
      expect(() => apt.cancel()).toThrow(InvalidStatusTransitionException);
    });
  });

  describe("confirm()", () => {
    it("transitions PENDING to CONFIRMED", () => {
      const apt = makeAppointment();
      apt.confirm();
      expect(apt.status.value).toBe("CONFIRMED");
    });

    it("throws InvalidStatusTransitionException when confirming an already CONFIRMED appointment", () => {
      const apt = makeAppointment(AppointmentStatus.confirmed());
      expect(() => apt.confirm()).toThrow(InvalidStatusTransitionException);
    });

    it("throws InvalidStatusTransitionException when confirming a CANCELLED appointment", () => {
      const apt = makeAppointment(AppointmentStatus.cancelled());
      expect(() => apt.confirm()).toThrow(InvalidStatusTransitionException);
    });
  });

  describe("complete()", () => {
    it("transitions CONFIRMED to COMPLETED", () => {
      const apt = makeAppointment(AppointmentStatus.confirmed());
      apt.complete();
      expect(apt.status.value).toBe("COMPLETED");
    });

    it("throws InvalidStatusTransitionException when completing a PENDING appointment", () => {
      const apt = makeAppointment();
      expect(() => apt.complete()).toThrow(InvalidStatusTransitionException);
    });

    it("throws InvalidStatusTransitionException when completing a CANCELLED appointment", () => {
      const apt = makeAppointment(AppointmentStatus.cancelled());
      expect(() => apt.complete()).toThrow(InvalidStatusTransitionException);
    });
  });

  describe("markAsNoShow()", () => {
    it("transitions CONFIRMED to NO_SHOW", () => {
      const apt = makeAppointment(AppointmentStatus.confirmed());
      apt.markAsNoShow();
      expect(apt.status.value).toBe("NO_SHOW");
    });

    it("throws InvalidStatusTransitionException when marking PENDING as NO_SHOW", () => {
      const apt = makeAppointment();
      expect(() => apt.markAsNoShow()).toThrow(InvalidStatusTransitionException);
    });
  });

  describe("isActive()", () => {
    it("PENDING appointment is active", () => {
      expect(makeAppointment().isActive()).toBe(true);
    });

    it("CONFIRMED appointment is active", () => {
      expect(makeAppointment(AppointmentStatus.confirmed()).isActive()).toBe(true);
    });

    it("CANCELLED appointment is not active", () => {
      expect(makeAppointment(AppointmentStatus.cancelled()).isActive()).toBe(false);
    });

    it("COMPLETED appointment is not active", () => {
      expect(makeAppointment(AppointmentStatus.completed()).isActive()).toBe(false);
    });

    it("NO_SHOW appointment is not active", () => {
      expect(makeAppointment(AppointmentStatus.noShow()).isActive()).toBe(false);
    });
  });

  describe("overlapsWith()", () => {
    it("returns true for two active appointments with overlapping slots", () => {
      const start1 = new Date(Date.now() + 120 * 60_000);
      const start2 = new Date(start1.getTime() + 15 * 60_000); // 15 min later

      const slot1 = TimeSlot.fromDuration(start1, 30);
      const slot2 = TimeSlot.fromDuration(start2, 30);

      const apt1 = Appointment.create(businessId(), serviceId(), clientId(), slot1);
      const apt2 = Appointment.create(businessId(), serviceId(), clientId(), slot2);

      expect(apt1.overlapsWith(apt2)).toBe(true);
    });

    it("returns false for two active appointments with non-overlapping slots", () => {
      const start1 = new Date(Date.now() + 120 * 60_000);
      const start2 = new Date(start1.getTime() + 60 * 60_000); // 60 min later (after slot1 ends)

      const slot1 = TimeSlot.fromDuration(start1, 30);
      const slot2 = TimeSlot.fromDuration(start2, 30);

      const apt1 = Appointment.create(businessId(), serviceId(), clientId(), slot1);
      const apt2 = Appointment.create(businessId(), serviceId(), clientId(), slot2);

      expect(apt1.overlapsWith(apt2)).toBe(false);
    });

    it("returns false when one appointment is CANCELLED (even if slots overlap)", () => {
      const start1 = new Date(Date.now() + 120 * 60_000);
      const start2 = new Date(start1.getTime() + 15 * 60_000);

      const slot1 = TimeSlot.fromDuration(start1, 30);
      const slot2 = TimeSlot.fromDuration(start2, 30);

      const apt1 = Appointment.create(businessId(), serviceId(), clientId(), slot1);
      const apt2 = Appointment.reconstitute(
        AppointmentId.fromString(APT_ID),
        businessId(),
        serviceId(),
        clientId(),
        slot2,
        AppointmentStatus.cancelled(),
        new Date(),
      );

      expect(apt1.overlapsWith(apt2)).toBe(false);
    });

    it("returns false when both appointments are CANCELLED", () => {
      const slot = futureSlot();
      const apt1 = Appointment.reconstitute(
        AppointmentId.fromString(APT_ID),
        businessId(),
        serviceId(),
        clientId(),
        slot,
        AppointmentStatus.cancelled(),
        new Date(),
      );
      const apt2 = Appointment.reconstitute(
        AppointmentId.fromString("eff57142-aecc-4149-a166-16178fb4d0cd"),
        businessId(),
        serviceId(),
        clientId(),
        slot,
        AppointmentStatus.cancelled(),
        new Date(),
      );

      expect(apt1.overlapsWith(apt2)).toBe(false);
    });
  });
});
