type SlotRule = {
  startTime: string;
  endTime: string;
  slotIntervalMin: number;
};

function parseTime(time: string): [number, number] {
  const [h, m] = time.split(":").map(Number);
  return [h, m];
}

function setUtcTime(baseDate: Date, hhmm: string): Date {
  const date = new Date(baseDate);
  const [hours, minutes] = parseTime(hhmm);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

export function buildSlots(rule: SlotRule, targetDate: Date, durationMin: number): Date[] {
  const start = setUtcTime(targetDate, rule.startTime);
  const end = setUtcTime(targetDate, rule.endTime);
  const slots: Date[] = [];

  const durationMs = durationMin * 60_000;
  const stepMs = rule.slotIntervalMin * 60_000;

  for (let cursor = start.getTime(); cursor + durationMs <= end.getTime(); cursor += stepMs) {
    slots.push(new Date(cursor));
  }

  return slots;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}
