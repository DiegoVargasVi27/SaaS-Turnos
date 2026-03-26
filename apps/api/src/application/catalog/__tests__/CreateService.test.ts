import { describe, expect, it, vi, beforeEach } from "vitest";
import { CreateService } from "../CreateService";
import { IServiceRepository } from "../../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../../domain/catalog/entities/service/Service";

function buildMockRepo(overrides: Partial<IServiceRepository> = {}): IServiceRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByBusinessId: vi.fn().mockResolvedValue([]),
    findActiveByBusinessId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    findBusinessBySlug: vi.fn().mockResolvedValue(null),
    findActiveById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const VALID_COMMAND = {
  businessId: "27d664fa-e366-4258-9c27-acbc359489d7",
  name: "Haircut",
  durationMinutes: 30,
  priceCents: 2500,
};

describe("CreateService", () => {
  let repo: IServiceRepository;
  let useCase: CreateService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = buildMockRepo({
      save: vi.fn().mockImplementation(async (svc: Service) => svc),
    });
    useCase = new CreateService(repo);
  });

  it("creates a service and returns a DTO", async () => {
    const result = await useCase.execute(VALID_COMMAND);

    expect(result).toBeDefined();
    expect(result.name).toBe("Haircut");
    expect(result.durationMin).toBe(30);
    expect(result.priceCents).toBe(2500);
    expect(result.isActive).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("persists the service via save()", async () => {
    await useCase.execute(VALID_COMMAND);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("persists service with the correct businessId", async () => {
    await useCase.execute(VALID_COMMAND);

    const savedService = vi.mocked(repo.save).mock.calls[0][0] as Service;
    expect(savedService.businessId.value).toBe(VALID_COMMAND.businessId);
  });

  it("uses optional currency when provided", async () => {
    const result = await useCase.execute({ ...VALID_COMMAND, currency: "EUR" });
    expect(result.currency).toBe("EUR");
  });

  it("defaults to USD when no currency provided", async () => {
    const result = await useCase.execute(VALID_COMMAND);
    expect(result.currency).toBe("USD");
  });

  it("throws a domain error for name shorter than 2 characters", async () => {
    await expect(useCase.execute({ ...VALID_COMMAND, name: "A" })).rejects.toThrow(
      "at least 2 characters",
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("throws a domain error for duration that is not a multiple of 5", async () => {
    await expect(useCase.execute({ ...VALID_COMMAND, durationMinutes: 17 })).rejects.toThrow(
      "multiple of 5 minutes",
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("throws a domain error for negative price", async () => {
    await expect(useCase.execute({ ...VALID_COMMAND, priceCents: -100 })).rejects.toThrow(
      "cannot be negative",
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
