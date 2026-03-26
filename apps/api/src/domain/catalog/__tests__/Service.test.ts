import { describe, expect, it } from "vitest";
import { Service } from "../entities/service/Service";
import { ServiceName } from "../entities/service/ServiceName";
import { Duration } from "../entities/service/Duration";
import { Money } from "../entities/service/Money";
import { BusinessId } from "../../shared/types/BusinessId";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";

function makeService(opts?: {
  name?: string;
  durationMinutes?: number;
  priceCents?: number;
  currency?: string;
}): Service {
  return Service.create(
    BusinessId.fromString(BIZ_ID),
    opts?.name ?? "Haircut",
    opts?.durationMinutes ?? 30,
    opts?.priceCents ?? 2500,
    opts?.currency,
  );
}

describe("ServiceName", () => {
  it("creates with a valid name of at least 2 characters", () => {
    expect(() => ServiceName.create("AB")).not.toThrow();
  });

  it("throws for names shorter than 2 characters", () => {
    expect(() => ServiceName.create("A")).toThrow("at least 2 characters");
  });

  it("throws for empty string", () => {
    expect(() => ServiceName.create("")).toThrow("at least 2 characters");
  });

  it("throws for names longer than 100 characters", () => {
    expect(() => ServiceName.create("A".repeat(101))).toThrow("cannot exceed 100 characters");
  });

  it("trims whitespace before validation", () => {
    const name = ServiceName.create("  Haircut  ");
    expect(name.value).toBe("Haircut");
  });

  it("name with exactly 100 chars is valid", () => {
    expect(() => ServiceName.create("A".repeat(100))).not.toThrow();
  });
});

describe("Duration", () => {
  it("creates with a valid positive multiple of 5", () => {
    expect(() => Duration.fromMinutes(30)).not.toThrow();
    expect(() => Duration.fromMinutes(60)).not.toThrow();
    expect(() => Duration.fromMinutes(5)).not.toThrow();
  });

  it("throws for non-multiple of 5 (17 minutes)", () => {
    expect(() => Duration.fromMinutes(17)).toThrow("multiple of 5 minutes");
  });

  it("throws for zero duration", () => {
    expect(() => Duration.fromMinutes(0)).toThrow("must be positive");
  });

  it("throws for negative duration", () => {
    expect(() => Duration.fromMinutes(-30)).toThrow("must be positive");
  });

  it("throws for durations over 480 minutes (8 hours)", () => {
    expect(() => Duration.fromMinutes(485)).toThrow("cannot exceed 8 hours");
  });

  it("allows 480 minutes exactly", () => {
    expect(() => Duration.fromMinutes(480)).not.toThrow();
  });

  it("hours getter returns correct value", () => {
    expect(Duration.fromMinutes(120).hours).toBe(2);
  });
});

describe("Money", () => {
  it("creates with a non-negative integer and valid currency", () => {
    expect(() => Money.create(2500, "USD")).not.toThrow();
  });

  it("creates with zero amount (free service)", () => {
    expect(() => Money.create(0, "USD")).not.toThrow();
  });

  it("defaults to USD when no currency provided", () => {
    const money = Money.create(1000);
    expect(money.currency).toBe("USD");
  });

  it("throws for negative amount", () => {
    expect(() => Money.create(-100, "USD")).toThrow("cannot be negative");
  });

  it("throws for non-integer amount (floating point)", () => {
    expect(() => Money.create(19.99, "USD")).toThrow("must be an integer");
  });

  it("throws for invalid currency code (not 3 letters)", () => {
    expect(() => Money.create(1000, "US")).toThrow("Invalid currency code");
    expect(() => Money.create(1000, "USDC")).toThrow("Invalid currency code");
  });

  it("throws for currency with non-letter characters", () => {
    expect(() => Money.create(1000, "12D")).toThrow("Invalid currency code");
  });

  it("normalizes currency to uppercase", () => {
    const money = Money.create(1000, "usd");
    expect(money.currency).toBe("USD");
  });

  it("amountMajor returns dollars from cents", () => {
    const money = Money.create(2500, "USD");
    expect(money.amountMajor).toBe(25);
  });

  it("add() returns sum of two same-currency amounts", () => {
    const a = Money.create(1000, "USD");
    const b = Money.create(500, "USD");
    expect(a.add(b).amountCents).toBe(1500);
  });

  it("add() throws for different currencies", () => {
    const usd = Money.create(1000, "USD");
    const eur = Money.create(1000, "EUR");
    expect(() => usd.add(eur)).toThrow("different currencies");
  });

  it("isGreaterThan() compares amounts", () => {
    const high = Money.create(2000, "USD");
    const low = Money.create(1000, "USD");
    expect(high.isGreaterThan(low)).toBe(true);
    expect(low.isGreaterThan(high)).toBe(false);
  });
});

describe("Service", () => {
  describe("create()", () => {
    it("creates an active service by default", () => {
      const service = makeService();
      expect(service.isActive).toBe(true);
    });

    it("delegates name validation to ServiceName", () => {
      expect(() => makeService({ name: "A" })).toThrow("at least 2 characters");
    });

    it("delegates duration validation to Duration", () => {
      expect(() => makeService({ durationMinutes: 17 })).toThrow("multiple of 5 minutes");
    });

    it("delegates price validation to Money", () => {
      expect(() => makeService({ priceCents: -100 })).toThrow("cannot be negative");
    });

    it("stores all fields correctly", () => {
      const service = makeService({ name: "Massage", durationMinutes: 60, priceCents: 5000 });
      expect(service.name.value).toBe("Massage");
      expect(service.duration.minutes).toBe(60);
      expect(service.price.amountCents).toBe(5000);
      expect(service.businessId.value).toBe(BIZ_ID);
    });
  });

  describe("deactivate() / activate()", () => {
    it("deactivate() sets isActive to false", () => {
      const service = makeService();
      service.deactivate();
      expect(service.isActive).toBe(false);
    });

    it("activate() sets isActive to true after deactivation", () => {
      const service = makeService();
      service.deactivate();
      service.activate();
      expect(service.isActive).toBe(true);
    });
  });

  describe("canBeBooked()", () => {
    it("returns true for an active service", () => {
      expect(makeService().canBeBooked()).toBe(true);
    });

    it("returns false for an inactive service", () => {
      const service = makeService();
      service.deactivate();
      expect(service.canBeBooked()).toBe(false);
    });
  });

  describe("updateName()", () => {
    it("updates the name when valid", () => {
      const service = makeService();
      service.updateName("Premium Haircut");
      expect(service.name.value).toBe("Premium Haircut");
    });

    it("validates the new name", () => {
      const service = makeService();
      expect(() => service.updateName("X")).toThrow("at least 2 characters");
    });
  });

  describe("updateDuration()", () => {
    it("updates the duration when valid", () => {
      const service = makeService();
      service.updateDuration(60);
      expect(service.duration.minutes).toBe(60);
    });

    it("validates the new duration", () => {
      const service = makeService();
      expect(() => service.updateDuration(13)).toThrow("multiple of 5 minutes");
    });
  });

  describe("updatePrice()", () => {
    it("updates the price when valid", () => {
      const service = makeService();
      service.updatePrice(3000);
      expect(service.price.amountCents).toBe(3000);
    });

    it("preserves existing currency when none provided", () => {
      const service = makeService({ currency: "EUR" });
      service.updatePrice(3000);
      expect(service.price.currency).toBe("EUR");
    });

    it("validates the new price", () => {
      const service = makeService();
      expect(() => service.updatePrice(-50)).toThrow("cannot be negative");
    });
  });
});
