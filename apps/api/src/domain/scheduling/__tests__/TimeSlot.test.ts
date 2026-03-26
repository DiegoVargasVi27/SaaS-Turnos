import { describe, expect, it } from "vitest";
import { TimeSlot } from "../entities/appointment/TimeSlot";

// Helper: create a future date N minutes from now
function futureDate(minutesFromNow: number): Date {
  return new Date(Date.now() + minutesFromNow * 60_000);
}

// Helper: create a date at a fixed UTC time on a given date string
function utcDate(dateStr: string, hours: number, minutes: number = 0): Date {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

describe("TimeSlot", () => {
  describe("fromDuration()", () => {
    it("calculates endsAt correctly from start and duration", () => {
      const start = futureDate(60);
      const slot = TimeSlot.fromDuration(start, 30);
      const expectedEnd = new Date(start.getTime() + 30 * 60_000);
      expect(slot.endsAt.getTime()).toBe(expectedEnd.getTime());
    });

    it("durationMinutes matches the provided duration", () => {
      const start = futureDate(60);
      const slot = TimeSlot.fromDuration(start, 45);
      expect(slot.durationMinutes).toBe(45);
    });
  });

  describe("fromRange()", () => {
    it("creates a valid TimeSlot when start is before end on the same day", () => {
      const start = utcDate("2030-06-15", 9, 0);
      const end = utcDate("2030-06-15", 10, 0);
      const slot = TimeSlot.fromRange(start, end);
      expect(slot.startsAt).toEqual(start);
      expect(slot.endsAt).toEqual(end);
    });

    it("throws when start is equal to end", () => {
      const t = utcDate("2030-06-15", 9, 0);
      expect(() => TimeSlot.fromRange(t, t)).toThrow("start time must be before end time");
    });

    it("throws when start is after end", () => {
      const start = utcDate("2030-06-15", 11, 0);
      const end = utcDate("2030-06-15", 9, 0);
      expect(() => TimeSlot.fromRange(start, end)).toThrow("start time must be before end time");
    });

    it("throws when slot crosses day boundary", () => {
      const start = utcDate("2030-06-15", 23, 0);
      const end = utcDate("2030-06-16", 1, 0);
      expect(() => TimeSlot.fromRange(start, end)).toThrow("cannot cross day boundaries");
    });
  });

  describe("overlaps()", () => {
    it("detects overlapping slots (A starts before B ends, A ends after B starts)", () => {
      const slotA = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      const slotB = TimeSlot.fromRange(utcDate("2030-06-15", 9, 30), utcDate("2030-06-15", 10, 30));
      expect(slotA.overlaps(slotB)).toBe(true);
      expect(slotB.overlaps(slotA)).toBe(true);
    });

    it("adjacent slots do NOT overlap (end of A equals start of B)", () => {
      const slotA = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      const slotB = TimeSlot.fromRange(utcDate("2030-06-15", 10, 0), utcDate("2030-06-15", 11, 0));
      expect(slotA.overlaps(slotB)).toBe(false);
      expect(slotB.overlaps(slotA)).toBe(false);
    });

    it("non-overlapping slots return false", () => {
      const slotA = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      const slotB = TimeSlot.fromRange(utcDate("2030-06-15", 11, 0), utcDate("2030-06-15", 12, 0));
      expect(slotA.overlaps(slotB)).toBe(false);
    });

    it("identical slots overlap", () => {
      const slotA = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      const slotB = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      expect(slotA.overlaps(slotB)).toBe(true);
    });

    it("slot fully contained within another overlaps", () => {
      const outer = TimeSlot.fromRange(utcDate("2030-06-15", 8, 0), utcDate("2030-06-15", 12, 0));
      const inner = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      expect(outer.overlaps(inner)).toBe(true);
      expect(inner.overlaps(outer)).toBe(true);
    });
  });

  describe("isWithinRange()", () => {
    it("returns true when slot is fully within range", () => {
      const slot = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      const rangeStart = utcDate("2030-06-15", 8, 0);
      const rangeEnd = utcDate("2030-06-15", 18, 0);
      expect(slot.isWithinRange(rangeStart, rangeEnd)).toBe(true);
    });

    it("returns false when slot starts before range", () => {
      const slot = TimeSlot.fromRange(utcDate("2030-06-15", 7, 30), utcDate("2030-06-15", 9, 0));
      const rangeStart = utcDate("2030-06-15", 8, 0);
      const rangeEnd = utcDate("2030-06-15", 18, 0);
      expect(slot.isWithinRange(rangeStart, rangeEnd)).toBe(false);
    });

    it("returns false when slot ends after range", () => {
      const slot = TimeSlot.fromRange(utcDate("2030-06-15", 17, 0), utcDate("2030-06-15", 18, 30));
      const rangeStart = utcDate("2030-06-15", 8, 0);
      const rangeEnd = utcDate("2030-06-15", 18, 0);
      expect(slot.isWithinRange(rangeStart, rangeEnd)).toBe(false);
    });

    it("slot exactly at range boundaries is within range", () => {
      const rangeStart = utcDate("2030-06-15", 9, 0);
      const rangeEnd = utcDate("2030-06-15", 17, 0);
      const slot = TimeSlot.fromRange(rangeStart, rangeEnd);
      expect(slot.isWithinRange(rangeStart, rangeEnd)).toBe(true);
    });
  });

  describe("isInFuture()", () => {
    it("returns true for a slot that starts in the future", () => {
      const slot = TimeSlot.fromDuration(futureDate(120), 30);
      expect(slot.isInFuture()).toBe(true);
    });

    it("returns false for a slot that started in the past", () => {
      const past = new Date(Date.now() - 2 * 60 * 60_000); // 2 hours ago
      const end = new Date(past.getTime() + 30 * 60_000); // still in past
      const slot = TimeSlot.fromRange(past, end);
      expect(slot.isInFuture()).toBe(false);
    });
  });

  describe("durationMinutes", () => {
    it("returns correct duration for a 30-minute slot", () => {
      const start = utcDate("2030-06-15", 9, 0);
      const end = utcDate("2030-06-15", 9, 30);
      const slot = TimeSlot.fromRange(start, end);
      expect(slot.durationMinutes).toBe(30);
    });

    it("returns correct duration for a 90-minute slot", () => {
      const start = utcDate("2030-06-15", 9, 0);
      const end = utcDate("2030-06-15", 10, 30);
      const slot = TimeSlot.fromRange(start, end);
      expect(slot.durationMinutes).toBe(90);
    });
  });

  describe("equals()", () => {
    it("slots with same start and end are equal", () => {
      const start = utcDate("2030-06-15", 9, 0);
      const end = utcDate("2030-06-15", 10, 0);
      const a = TimeSlot.fromRange(start, end);
      const b = TimeSlot.fromRange(start, end);
      expect(a.equals(b)).toBe(true);
    });

    it("slots with different times are not equal", () => {
      const a = TimeSlot.fromRange(utcDate("2030-06-15", 9, 0), utcDate("2030-06-15", 10, 0));
      const b = TimeSlot.fromRange(utcDate("2030-06-15", 10, 0), utcDate("2030-06-15", 11, 0));
      expect(a.equals(b)).toBe(false);
    });
  });
});
