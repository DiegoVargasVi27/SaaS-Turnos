import { describe, expect, it, vi, beforeEach } from "vitest";
import { DeleteService } from "../DeleteService";
import { IServiceRepository } from "../../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../../domain/shared/types/BusinessId";
import { CatalogError } from "../CatalogError";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";

function makeExistingService(): Service {
  return Service.create(BusinessId.fromString(BIZ_ID), "Haircut", 30, 2500);
}

function buildMockRepo(overrides: Partial<IServiceRepository> = {}): IServiceRepository {
  return {
    save: vi.fn().mockImplementation(async (svc: Service) => svc),
    findById: vi.fn().mockResolvedValue(makeExistingService()),
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

describe("DeleteService", () => {
  let repo: IServiceRepository;
  let useCase: DeleteService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = buildMockRepo();
    useCase = new DeleteService(repo);
  });

  it("soft-deletes service by calling deactivate() and save()", async () => {
    let capturedService: Service | null = null;
    repo = buildMockRepo({
      save: vi.fn().mockImplementation(async (svc: Service) => {
        capturedService = svc;
        return svc;
      }),
    });
    useCase = new DeleteService(repo);

    await useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID });

    expect(repo.save).toHaveBeenCalledOnce();
    expect(capturedService).not.toBeNull();
    expect(capturedService!.isActive).toBe(false);
  });

  it("does NOT call repo.delete() — uses soft delete via save()", async () => {
    await useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("throws CATALOG_SERVICE_NOT_FOUND when service does not exist", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new DeleteService(repo);

    await expect(
      useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID })
    ).rejects.toMatchObject({ code: "CATALOG_SERVICE_NOT_FOUND" });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("throws CATALOG_SERVICE_HAS_APPOINTMENTS when service has future appointments", async () => {
    repo = buildMockRepo({ hasFutureAppointments: vi.fn().mockResolvedValue(true) });
    useCase = new DeleteService(repo);

    await expect(
      useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID })
    ).rejects.toMatchObject({ code: "CATALOG_SERVICE_HAS_APPOINTMENTS" });
  });

  it("does NOT save service when future appointments guard triggers", async () => {
    repo = buildMockRepo({ hasFutureAppointments: vi.fn().mockResolvedValue(true) });
    useCase = new DeleteService(repo);

    await expect(
      useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID })
    ).rejects.toBeInstanceOf(CatalogError);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("checks hasFutureAppointments before modifying the service", async () => {
    const callOrder: string[] = [];
    repo = buildMockRepo({
      hasFutureAppointments: vi.fn().mockImplementation(async () => {
        callOrder.push("hasFutureAppointments");
        return false;
      }),
      save: vi.fn().mockImplementation(async (svc: Service) => {
        callOrder.push("save");
        return svc;
      }),
    });
    useCase = new DeleteService(repo);

    await useCase.execute({ serviceId: SVC_ID, businessId: BIZ_ID });

    expect(callOrder.indexOf("hasFutureAppointments")).toBeLessThan(callOrder.indexOf("save"));
  });
});
