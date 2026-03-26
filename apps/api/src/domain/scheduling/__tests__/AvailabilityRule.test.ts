import { describe, expect, it } from "vitest";
import { AvailabilityRule } from "../entities/availability/AvailabilityRule";
import { WeekDay } from "../entities/availability/WeekDay";
import { TimeRange } from "../entities/availability/TimeRange";
import { SlotInterval } from "../entities/availability/SlotInterval";
import { BusinessId } from "../../shared/types/BusinessId";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";

function makeRule(opts?: {
  weekday?: number;
  startTime?: string;
  endTime?: string;
  slotInterval?: number;
}): AvailabilityRule {
  return AvailabilityRule.create(
    BusinessId.fromString(BIZ_ID),
    WeekDay.fromNumber(opts?.weekday ?? 1),
    TimeRange.create(opts?.startTime ?? "09:00", opts?.endTime ?? "17:00"),
    SlotInterval.create(opts?.slotInterval ?? 30),
  );
}

describe("AvailabilityRule", () => {
  describe("create()", () => {
    it("creates an active rule by default", () => {
      const rule = makeRule();
      expect(rule.isActive).toBe(true);
    });

    it("stores all fields correctly", () => {
      const rule = makeRule({ weekday: 1, startTime: "09:00", endTime: "17:00", slotInterval: 30 });
      expect(rule.weekDay.value).toBe(1);
      expect(rule.timeRange.startTime).toBe("09:00");
      expect(rule.timeRange.endTime).toBe("17:00");
      expect(rule.slotInterval.minutes).toBe(30);
      expect(rule.businessId.value).toBe(BIZ_ID);
    });

    it("generates a rule ID when none provided", () => {
      const rule = makeRule();
      expect(rule.id).toBeDefined();
    });
  });

  describe("activate() / deactivate()", () => {
    it("deactivate() sets isActive to false", () => {
      const rule = makeRule();
      rule.deactivate();
      expect(rule.isActive).toBe(false);
    });

    it("activate() sets isActive to true after deactivation", () => {
      const rule = makeRule();
      rule.deactivate();
      rule.activate();
      expect(rule.isActive).toBe(true);
    });
  });

  describe("containsTimeSlot()", () => {
    it("returns true when slot is within the time range", () => {
      const rule = makeRule({ startTime: "09:00", endTime: "17:00" });
      // 9:00 = 540min, 9:30 = 570min
      expect(rule.containsTimeSlot(540, 570)).toBe(true);
    });

    it("returns true for slot at the exact boundaries", () => {
      const rule = makeRule({ startTime: "09:00", endTime: "17:00" });
      // 9:00 = 540min, 17:00 = 1020min
      expect(rule.containsTimeSlot(540, 1020)).toBe(true);
    });

    it("returns false when slot starts before range", () => {
      const rule = makeRule({ startTime: "09:00", endTime: "17:00" });
      // 8:30 = 510min, 9:00 = 540min
      expect(rule.containsTimeSlot(510, 540)).toBe(false);
    });

    it("returns false when slot ends after range", () => {
      const rule = makeRule({ startTime: "09:00", endTime: "17:00" });
      // 16:45 = 1005min, 17:15 = 1035min
      expect(rule.containsTimeSlot(1005, 1035)).toBe(false);
    });

    it("returns false when rule is inactive", () => {
      const rule = makeRule({ startTime: "09:00", endTime: "17:00" });
      rule.deactivate();
      expect(rule.containsTimeSlot(540, 570)).toBe(false);
    });
  });

  describe("isAlignedWithInterval()", () => {
    it("returns true when slot start aligns with 30-min interval from rule start", () => {
      const rule = makeRule({ startTime: "09:00", slotInterval: 30 });
      // Rule starts at 9:00 (540min), so aligned slots: 540, 570, 600...
      expect(rule.isAlignedWithInterval(540)).toBe(true); // 9:00
      expect(rule.isAlignedWithInterval(570)).toBe(true); // 9:30
      expect(rule.isAlignedWithInterval(600)).toBe(true); // 10:00
    });

    it("returns false when slot start does not align with interval", () => {
      const rule = makeRule({ startTime: "09:00", slotInterval: 30 });
      // 9:15 = 555min — not aligned on 30-min interval from 9:00
      expect(rule.isAlignedWithInterval(555)).toBe(false);
      expect(rule.isAlignedWithInterval(545)).toBe(false);
    });

    it("returns false when slot start is before rule start", () => {
      const rule = makeRule({ startTime: "09:00", slotInterval: 30 });
      // 8:30 = 510min — before rule starts at 9:00 (540min)
      expect(rule.isAlignedWithInterval(510)).toBe(false);
    });

    it("handles 15-minute intervals correctly", () => {
      const rule = makeRule({ startTime: "09:00", slotInterval: 15 });
      expect(rule.isAlignedWithInterval(540)).toBe(true); // 9:00
      expect(rule.isAlignedWithInterval(555)).toBe(true); // 9:15
      expect(rule.isAlignedWithInterval(570)).toBe(true); // 9:30
      expect(rule.isAlignedWithInterval(548)).toBe(false); // 9:08 — not aligned
    });
  });
});

describe("WeekDay", () => {
  it("fromNumber() accepts values 0-6", () => {
    for (let i = 0; i <= 6; i++) {
      expect(() => WeekDay.fromNumber(i)).not.toThrow();
    }
  });

  it("fromNumber() throws for value 7", () => {
    expect(() => WeekDay.fromNumber(7)).toThrow("WeekDay must be an integer between 0");
  });

  it("fromNumber() throws for negative values", () => {
    expect(() => WeekDay.fromNumber(-1)).toThrow("WeekDay must be an integer between 0");
  });

  it("fromNumber() throws for non-integer values", () => {
    expect(() => WeekDay.fromNumber(1.5)).toThrow("WeekDay must be an integer between 0");
  });

  it("name getter returns the correct day name", () => {
    expect(WeekDay.fromNumber(0).name).toBe("Sunday");
    expect(WeekDay.fromNumber(1).name).toBe("Monday");
    expect(WeekDay.fromNumber(6).name).toBe("Saturday");
  });
});

describe("TimeRange", () => {
  it("create() accepts valid HH:MM times with end after start", () => {
    expect(() => TimeRange.create("09:00", "17:00")).not.toThrow();
  });

  it("throws for invalid start time format", () => {
    expect(() => TimeRange.create("9:00", "17:00")).toThrow("Invalid start time format");
  });

  it("throws for invalid end time format", () => {
    expect(() => TimeRange.create("09:00", "5pm")).toThrow("Invalid end time format");
  });

  it("throws when end time is before start time", () => {
    expect(() => TimeRange.create("17:00", "09:00")).toThrow("must be after start time");
  });

  it("throws when end time equals start time", () => {
    expect(() => TimeRange.create("09:00", "09:00")).toThrow("must be after start time");
  });

  it("startMinutes and endMinutes are correct", () => {
    const range = TimeRange.create("09:00", "17:00");
    expect(range.startMinutes).toBe(540); // 9 * 60
    expect(range.endMinutes).toBe(1020);  // 17 * 60
  });

  it("durationMinutes is correct", () => {
    const range = TimeRange.create("09:00", "17:00");
    expect(range.durationMinutes).toBe(480);
  });
});

describe("SlotInterval", () => {
  it("create() accepts valid positive integers", () => {
    expect(() => SlotInterval.create(30)).not.toThrow();
    expect(() => SlotInterval.create(15)).not.toThrow();
    expect(() => SlotInterval.create(60)).not.toThrow();
  });

  it("throws for zero", () => {
    expect(() => SlotInterval.create(0)).toThrow("positive integer");
  });

  it("throws for negative values", () => {
    expect(() => SlotInterval.create(-5)).toThrow("positive integer");
  });

  it("throws for non-integer values", () => {
    expect(() => SlotInterval.create(7.5)).toThrow("positive integer");
  });

  it("throws for values exceeding 480 minutes", () => {
    expect(() => SlotInterval.create(481)).toThrow("cannot exceed 480 minutes");
  });
});
