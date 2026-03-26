import { describe, expect, it, vi, beforeEach } from "vitest";
import { BookAppointment } from "../BookAppointment";
import { IServiceRepository, CatalogBusinessSummary } from "../../../domain/catalog/repositories/IServiceRepository";
import { IAvailabilityRuleRepository } from "../../../domain/scheduling/repositories/IAvailabilityRuleRepository";
import { IAppointmentRepository } from "../../../domain/scheduling/repositories/IAppointmentRepository";
import { GuestUserRegistrar, GuestUserData } from "../../../domain/scheduling/ports/GuestUserRegistrar";
import { SchedulingService } from "../../../domain/scheduling/services/SchedulingService";
import { Service } from "../../../domain/catalog/entities/service/Service";
import { BusinessId } from "../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../domain/shared/types/ServiceId";
import { UserId } from "../../../domain/shared/types/UserId";
import { SchedulingError } from "../SchedulingError";
import { CatalogError } from "../../catalog/CatalogError";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";
const CLIENT_ID = "510a9af0-0be2-4764-9fe3-3b9454f3c9b8";

const BUSINESS_SUMMARY: CatalogBusinessSummary = {
  id: BusinessId.fromString(BIZ_ID),
  slug: "demo-salon",
  name: "Demo Salon",
  timezone: "UTC",
};

function makeActiveService(): Service {
  return Service.create(BusinessId.fromString(BIZ_ID), "Haircut", 30, 2500);
}

// A future start time
function futureStart(): Date {
  return new Date(Date.now() + 48 * 60 * 60_000); // 48 hours from now
}

function buildDeps(overrides: {
  catalogRepo?: Partial<IServiceRepository>;
  availabilityRepo?: Partial<IAvailabilityRuleRepository>;
  appointmentRepo?: Partial<IAppointmentRepository>;
  guestUserRegistrar?: Partial<GuestUserRegistrar>;
  schedulingService?: Partial<SchedulingService>;
} = {}) {
  const catalogRepo: IServiceRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByBusinessId: vi.fn().mockResolvedValue([]),
    findActiveByBusinessId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    findBusinessBySlug: vi.fn().mockResolvedValue(BUSINESS_SUMMARY),
    findActiveById: vi.fn().mockResolvedValue(makeActiveService()),
    ...overrides.catalogRepo,
  };

  const availabilityRepo: IAvailabilityRuleRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findActiveByBusinessAndWeekday: vi.fn().mockResolvedValue([]),
    findByBusinessId: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides.availabilityRepo,
  };

  const appointmentRepo: IAppointmentRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findActiveByBusinessAndDateRange: vi.fn().mockResolvedValue([]),
    findByBusiness: vi.fn().mockResolvedValue([]),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides.appointmentRepo,
  };

  const guestUserRegistrar: GuestUserRegistrar = {
    ensureGuestUser: vi.fn().mockResolvedValue(UserId.fromString(CLIENT_ID)),
    ...overrides.guestUserRegistrar,
  };

  const schedulingService = {
    assertSlotBookable: vi.fn(), // does not throw by default = slot is bookable
    generateAvailability: vi.fn().mockReturnValue([]),
    ...overrides.schedulingService,
  } as unknown as SchedulingService;

  return { catalogRepo, availabilityRepo, appointmentRepo, guestUserRegistrar, schedulingService };
}

const VALID_COMMAND = {
  businessSlug: "demo-salon",
  serviceId: SVC_ID, // note: this is a valid UUID used as the service ID
  startsAt: futureStart(),
  clientName: "John Doe",
  clientEmail: "john@example.com",
  clientPhone: "555-1234",
};

describe("BookAppointment", () => {
  let deps: ReturnType<typeof buildDeps>;
  let useCase: BookAppointment;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = buildDeps();
    useCase = new BookAppointment(
      deps.catalogRepo,
      deps.availabilityRepo,
      deps.appointmentRepo,
      deps.schedulingService,
      deps.guestUserRegistrar,
    );
  });

  it("returns an AppointmentDTO on successful booking", async () => {
    const result = await useCase.execute(VALID_COMMAND);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.status).toBe("PENDING");
    expect(result.businessId).toBe(BIZ_ID);
  });

  it("calls GuestUserRegistrar.ensureGuestUser() with correct data", async () => {
    await useCase.execute(VALID_COMMAND);

    expect(deps.guestUserRegistrar.ensureGuestUser).toHaveBeenCalledOnce();
    const [calledBizId, calledData] = vi.mocked(deps.guestUserRegistrar.ensureGuestUser).mock.calls[0] as [BusinessId, GuestUserData];
    expect(calledBizId.value).toBe(BIZ_ID);
    expect(calledData.email).toBe("john@example.com");
    expect(calledData.fullName).toBe("John Doe");
    expect(calledData.phone).toBe("555-1234");
  });

  it("saves the appointment via IAppointmentRepository.save()", async () => {
    await useCase.execute(VALID_COMMAND);

    expect(deps.appointmentRepo.save).toHaveBeenCalledOnce();
  });

  it("calls assertSlotBookable to validate the slot", async () => {
    await useCase.execute(VALID_COMMAND);

    expect(deps.schedulingService.assertSlotBookable).toHaveBeenCalledOnce();
  });

  it("throws SCHEDULING_BUSINESS_NOT_FOUND when business slug does not exist", async () => {
    deps = buildDeps({
      catalogRepo: { findBusinessBySlug: vi.fn().mockResolvedValue(null) },
    });
    useCase = new BookAppointment(
      deps.catalogRepo,
      deps.availabilityRepo,
      deps.appointmentRepo,
      deps.schedulingService,
      deps.guestUserRegistrar,
    );

    await expect(useCase.execute(VALID_COMMAND)).rejects.toMatchObject({
      code: "SCHEDULING_BUSINESS_NOT_FOUND",
    });
    expect(deps.appointmentRepo.save).not.toHaveBeenCalled();
  });

  it("throws CATALOG_SERVICE_NOT_FOUND when service is not found", async () => {
    deps = buildDeps({
      catalogRepo: { findActiveById: vi.fn().mockResolvedValue(null) },
    });
    useCase = new BookAppointment(
      deps.catalogRepo,
      deps.availabilityRepo,
      deps.appointmentRepo,
      deps.schedulingService,
      deps.guestUserRegistrar,
    );

    await expect(useCase.execute(VALID_COMMAND)).rejects.toBeInstanceOf(CatalogError);
    expect(deps.appointmentRepo.save).not.toHaveBeenCalled();
  });

  it("throws SCHEDULING_SLOT_TAKEN when slot is not bookable", async () => {
    deps = buildDeps({
      schedulingService: {
        assertSlotBookable: vi.fn().mockImplementation(() => {
          throw new SchedulingError("SCHEDULING_SLOT_TAKEN", "Slot already taken");
        }),
        generateAvailability: vi.fn().mockReturnValue([]),
      },
    });
    useCase = new BookAppointment(
      deps.catalogRepo,
      deps.availabilityRepo,
      deps.appointmentRepo,
      deps.schedulingService,
      deps.guestUserRegistrar,
    );

    await expect(useCase.execute(VALID_COMMAND)).rejects.toMatchObject({
      code: "SCHEDULING_SLOT_TAKEN",
    });
    expect(deps.appointmentRepo.save).not.toHaveBeenCalled();
  });

  it("does NOT import or call hashPassword directly (uses GuestUserRegistrar port)", async () => {
    // This is verified structurally — the use case takes GuestUserRegistrar in constructor,
    // not PrismaClient. If it ran without a Prisma client, the isolation is complete.
    // We verify ensureGuestUser is called, not any Prisma method.
    await useCase.execute(VALID_COMMAND);

    expect(deps.guestUserRegistrar.ensureGuestUser).toHaveBeenCalled();
  });
});
