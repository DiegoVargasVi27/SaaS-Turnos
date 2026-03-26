import { describe, expect, it, vi, beforeEach } from "vitest";
import { ListServices } from "../ListServices";
import { IServiceRepository } from "../../../domain/catalog/repositories/IServiceRepository";
import { Service } from "../../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../../domain/shared/types/BusinessId";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";

function makeService(name: string, isActive: boolean = true): Service {
  const svc = Service.create(BusinessId.fromString(BIZ_ID), name, 30, 2500);
  if (!isActive) svc.deactivate();
  return svc;
}

const activeServices = [makeService("Haircut"), makeService("Massage"), makeService("Facial")];
const inactiveServices = [makeService("Old Service", false), makeService("Discontinued", false)];
const allServices = [...activeServices, ...inactiveServices];

function buildMockRepo(overrides: Partial<IServiceRepository> = {}): IServiceRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByBusinessId: vi.fn().mockResolvedValue(allServices),
    findActiveByBusinessId: vi.fn().mockResolvedValue(activeServices),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    findBusinessBySlug: vi.fn().mockResolvedValue(null),
    findActiveById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("ListServices", () => {
  let repo: IServiceRepository;
  let useCase: ListServices;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = buildMockRepo();
    useCase = new ListServices(repo);
  });

  it("returns only active services by default (includeInactive unset)", async () => {
    const result = await useCase.execute({ businessId: BIZ_ID });

    expect(repo.findActiveByBusinessId).toHaveBeenCalledOnce();
    expect(repo.findByBusinessId).not.toHaveBeenCalled();
    expect(result).toHaveLength(activeServices.length);
  });

  it("returns only active services when includeInactive is false", async () => {
    const result = await useCase.execute({ businessId: BIZ_ID, includeInactive: false });

    expect(repo.findActiveByBusinessId).toHaveBeenCalledOnce();
    expect(result).toHaveLength(activeServices.length);
  });

  it("returns all services (including inactive) when includeInactive is true", async () => {
    const result = await useCase.execute({ businessId: BIZ_ID, includeInactive: true });

    expect(repo.findByBusinessId).toHaveBeenCalledOnce();
    expect(repo.findActiveByBusinessId).not.toHaveBeenCalled();
    expect(result).toHaveLength(allServices.length);
  });

  it("returns empty array when no services found", async () => {
    repo = buildMockRepo({
      findActiveByBusinessId: vi.fn().mockResolvedValue([]),
    });
    useCase = new ListServices(repo);

    const result = await useCase.execute({ businessId: BIZ_ID });

    expect(result).toEqual([]);
  });

  it("returns DTOs with correct businessId", async () => {
    const result = await useCase.execute({ businessId: BIZ_ID });

    for (const dto of result) {
      expect(dto.businessId).toBe(BIZ_ID);
    }
  });

  it("calls findActiveByBusinessId with the correct businessId", async () => {
    await useCase.execute({ businessId: BIZ_ID });

    const calledWith = vi.mocked(repo.findActiveByBusinessId).mock.calls[0][0];
    expect(calledWith.value).toBe(BIZ_ID);
  });
});
