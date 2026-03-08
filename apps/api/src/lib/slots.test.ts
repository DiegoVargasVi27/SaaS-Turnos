import { describe, expect, it } from "vitest";
import { buildSlots, overlaps } from "./slots";

describe("buildSlots", () => {
  it("builds slot starts using interval and duration", () => {
    const targetDate = new Date("2026-03-09T00:00:00.000Z");

    const slots = buildSlots(
      {
        startTime: "09:00",
        endTime: "10:00",
        slotIntervalMin: 30,
      },
      targetDate,
      30,
    );

    expect(slots.map((slot) => slot.toISOString())).toEqual([
      "2026-03-09T09:00:00.000Z",
      "2026-03-09T09:30:00.000Z",
    ]);
  });

  it("does not create slot if service would overflow rule end", () => {
    const targetDate = new Date("2026-03-09T00:00:00.000Z");

    const slots = buildSlots(
      {
        startTime: "09:00",
        endTime: "10:00",
        slotIntervalMin: 30,
      },
      targetDate,
      45,
    );

    expect(slots.map((slot) => slot.toISOString())).toEqual(["2026-03-09T09:00:00.000Z"]);
  });
});

describe("overlaps", () => {
  it("returns true when ranges intersect", () => {
    const overlap = overlaps(
      new Date("2026-03-09T09:00:00.000Z"),
      new Date("2026-03-09T09:30:00.000Z"),
      new Date("2026-03-09T09:15:00.000Z"),
      new Date("2026-03-09T09:45:00.000Z"),
    );

    expect(overlap).toBe(true);
  });

  it("returns false when second range starts exactly at first end", () => {
    const overlap = overlaps(
      new Date("2026-03-09T09:00:00.000Z"),
      new Date("2026-03-09T09:30:00.000Z"),
      new Date("2026-03-09T09:30:00.000Z"),
      new Date("2026-03-09T10:00:00.000Z"),
    );

    expect(overlap).toBe(false);
  });
});
