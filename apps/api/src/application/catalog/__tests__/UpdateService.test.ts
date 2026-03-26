import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdateService } from "../UpdateService";
import { IServiceRepository } from "../../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../../domain/shared/types/BusinessId";
import { CatalogError } from "../CatalogError";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";

function makeExistingService(): Service {
  return Service.create(
    BusinessId.fromString(BIZ_ID),
    "Haircut",
    30,
    2500,
  );
}

function buildMockRepo(overrides: Partial<IServiceRepository> = {}): IServiceRepository {
  const service = makeExistingService();
  return {
    save: vi.fn().mockImplementation(async (svc: Service) => svc),
    findById: vi.fn().mockResolvedValue(service),
    findByBusinessId: vi.fn().mockResolvedValue([]),
    findActiveByBusinessId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    findBusinessBySlug: vi.fn().mockResolvedValue(null),
    findActiveById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("UpdateService", () => {
  let repo: IServiceRepository;
  let useCase: UpdateService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = buildMockRepo();
    useCase = new UpdateService(repo);
  });

  it("updates name and returns updated DTO", async () => {
    const result = await useCase.execute({
      serviceId: SVC_ID,
      businessId: BIZ_ID,
      name: "Premium Haircut",
    });

    expect(result.name).toBe("Premium Haircut");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("updates duration and returns updated DTO", async () => {
    const result = await useCase.execute({
      serviceId: SVC_ID,
      businessId: BIZ_ID,
      durationMinutes: 60,
    });

    expect(result.durationMin).toBe(60);
  });

  it("updates price and returns updated DTO", async () => {
    const result = await useCase.execute({
      serviceId: SVC_ID,
      businessId: BIZ_ID,
      priceCents: 3000,
    });

    expect(result.priceCents).toBe(3000);
  });

  it("performs partial update — untouched fields remain unchanged", async () => {
    const result = await useCase.execute({
      serviceId: SVC_ID,
      businessId: BIZ_ID,
      name: "New Name",
      // duration and price not provided — should remain as original
    });

    expect(result.name).toBe("New Name");
    expect(result.durationMin).toBe(30); // original
    expect(result.priceCents).toBe(2500); // original
  });

  it("throws CatalogError with CATALOG_SERVICE_NOT_FOUND when service does not exist", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new UpdateService(repo);

    await expect(
      useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID, name: "New Name" })
    ).rejects.toMatchObject({ code: "CATALOG_SERVICE_NOT_FOUND" });

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("throws domain error for invalid new name", async () => {
    await expect(
      useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID, name: "X" })
    ).rejects.toThrow("at least 2 characters");
  });

  it("throws CatalogError and not save when service not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new UpdateService(repo);

    await expect(
      useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID })
    ).rejects.toBeInstanceOf(CatalogError);
  });
});
