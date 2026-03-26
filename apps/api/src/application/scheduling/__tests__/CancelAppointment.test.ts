import { describe, expect, it, vi, beforeEach } from "vitest";
import { CancelAppointment } from "../CancelAppointment";
import { IAppointmentRepository } from "../../../domain/scheduling/repositories/IAppointmentRepository";
import { Appointment } from "../../../domain/scheduling/entities/appointment/Appointment";
import { AppointmentStatus } from "../../../domain/scheduling/entities/appointment/AppointmentStatus";
import { TimeSlot } from "../../../domain/scheduling/entities/appointment/TimeSlot";
import { AppointmentId } from "../../../domain/shared/types/AppointmentId";
import { BusinessId } from "../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../domain/shared/types/ServiceId";
import { UserId } from "../../../domain/shared/types/UserId";
import { SchedulingError } from "../SchedulingError";
import { InvalidStatusTransitionException } from "../../../domain/scheduling/exceptions/InvalidStatusTransitionException";

const APT_ID = "11dfe52f-2dce-4dc5-8561-0df4d9d33c07";
const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";
const CLIENT_ID = "510a9af0-0be2-4764-9fe3-3b9454f3c9b8";

function futureSlot(): TimeSlot {
  const start = new Date(Date.now() + 120 * 60_000);
  return TimeSlot.fromDuration(start, 30);
}

function makePendingAppointment(): Appointment {
  return Appointment.create(
    BusinessId.fromString(BIZ_ID),
    ServiceId.fromString(SVC_ID),
    UserId.fromString(CLIENT_ID),
    futureSlot(),
  );
}

function makeAppointmentWithStatus(status: AppointmentStatus): Appointment {
  return Appointment.reconstitute(
    AppointmentId.fromString(APT_ID),
    BusinessId.fromString(BIZ_ID),
    ServiceId.fromString(SVC_ID),
    UserId.fromString(CLIENT_ID),
    futureSlot(),
    status,
    new Date(),
  );
}

function buildMockRepo(overrides: Partial<IAppointmentRepository> = {}): IAppointmentRepository {
  return {
    findById: vi.fn().mockResolvedValue(makePendingAppointment()),
    findActiveByBusinessAndDateRange: vi.fn().mockResolvedValue([]),
    findByBusiness: vi.fn().mockResolvedValue([]),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CancelAppointment", () => {
  let repo: IAppointmentRepository;
  let useCase: CancelAppointment;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = buildMockRepo();
    useCase = new CancelAppointment(repo);
  });

  it("cancels a PENDING appointment and returns updated DTO", async () => {
    const result = await useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID });

    expect(result).toBeDefined();
    expect(result.status).toBe("CANCELLED");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("cancels a CONFIRMED appointment successfully", async () => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(makeAppointmentWithStatus(AppointmentStatus.confirmed())),
    });
    useCase = new CancelAppointment(repo);

    const result = await useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID });

    expect(result.status).toBe("CANCELLED");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("throws SCHEDULING_APPOINTMENT_NOT_FOUND when appointment does not exist", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new CancelAppointment(repo);

    await expect(
      useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID })
    ).rejects.toMatchObject({ code: "SCHEDULING_APPOINTMENT_NOT_FOUND" });

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("throws SchedulingError when appointment not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new CancelAppointment(repo);

    await expect(
      useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID })
    ).rejects.toBeInstanceOf(SchedulingError);
  });

  it("throws InvalidStatusTransitionException when cancelling a COMPLETED appointment", async () => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(makeAppointmentWithStatus(AppointmentStatus.completed())),
    });
    useCase = new CancelAppointment(repo);

    await expect(
      useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID })
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("throws InvalidStatusTransitionException when cancelling a CANCELLED appointment", async () => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(makeAppointmentWithStatus(AppointmentStatus.cancelled())),
    });
    useCase = new CancelAppointment(repo);

    await expect(
      useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID })
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
  });

  it("looks up appointment by the provided appointmentId", async () => {
    await useCase.execute({ appointmentId: APT_ID, businessId: BIZ_ID });

    const calledWith = vi.mocked(repo.findById).mock.calls[0][0];
    expect(calledWith.value).toBe(APT_ID);
  });
});
