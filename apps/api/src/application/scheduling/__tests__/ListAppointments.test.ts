import { describe, expect, it, vi, beforeEach } from "vitest";
import { ListAppointments } from "../ListAppointments";
import { IAppointmentRepository } from "../../../domain/scheduling/repositories/IAppointmentRepository";
import { Appointment } from "../../../domain/scheduling/entities/appointment/Appointment";
import { AppointmentStatus } from "../../../domain/scheduling/entities/appointment/AppointmentStatus";
import { TimeSlot } from "../../../domain/scheduling/entities/appointment/TimeSlot";
import { AppointmentId } from "../../../domain/shared/types/AppointmentId";
import { BusinessId } from "../../../domain/shared/types/BusinessId";
import { ServiceId } from "../../../domain/shared/types/ServiceId";
import { UserId } from "../../../domain/shared/types/UserId";

const BIZ_ID = "27d664fa-e366-4258-9c27-acbc359489d7";
const SVC_ID = "bde5fd37-3a54-47e5-9040-a2347f201bb9";
const CLIENT_ID = "510a9af0-0be2-4764-9fe3-3b9454f3c9b8";

function makeAppointment(id: string, statusOverride?: AppointmentStatus): Appointment {
  const start = new Date(Date.now() + 120 * 60_000);
  const slot = TimeSlot.fromDuration(start, 30);
  return Appointment.reconstitute(
    AppointmentId.fromString(id),
    BusinessId.fromString(BIZ_ID),
    ServiceId.fromString(SVC_ID),
    UserId.fromString(CLIENT_ID),
    slot,
    statusOverride ?? AppointmentStatus.pending(),
    new Date(),
  );
}

const PENDING_APT = makeAppointment("11dfe52f-2dce-4dc5-8561-0df4d9d33c07", AppointmentStatus.pending());
const CONFIRMED_APT = makeAppointment("a401822e-5c69-4f97-800c-2880a9a68a00", AppointmentStatus.confirmed());
const CANCELLED_APT = makeAppointment("eff57142-aecc-4149-a166-16178fb4d0cd", AppointmentStatus.cancelled());

function buildMockRepo(appointments: Appointment[] = [PENDING_APT, CONFIRMED_APT, CANCELLED_APT]): IAppointmentRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findActiveByBusinessAndDateRange: vi.fn().mockResolvedValue([]),
    findByBusiness: vi.fn().mockResolvedValue(appointments),
    hasFutureAppointments: vi.fn().mockResolvedValue(false),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ListAppointments", () => {
  let repo: IAppointmentRepository;
  let useCase: ListAppointments;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = buildMockRepo();
    useCase = new ListAppointments(repo);
  });

  it("calls findByBusiness with correct businessId", async () => {
    await useCase.execute({ businessId: BIZ_ID });

    expect(repo.findByBusiness).toHaveBeenCalledOnce();
    const calledWith = vi.mocked(repo.findByBusiness).mock.calls[0][0];
    expect(calledWith.value).toBe(BIZ_ID);
  });

  it("returns DTOs for all appointments when no filters provided", async () => {
    const result = await useCase.execute({ businessId: BIZ_ID });

    expect(result).toHaveLength(3);
  });

  it("returns empty array when no appointments exist", async () => {
    repo = buildMockRepo([]);
    useCase = new ListAppointments(repo);

    const result = await useCase.execute({ businessId: BIZ_ID });

    expect(result).toEqual([]);
  });

  it("passes date filter to findByBusiness when provided", async () => {
    await useCase.execute({ businessId: BIZ_ID, date: "2026-03-21" });

    const filters = vi.mocked(repo.findByBusiness).mock.calls[0][1];
    expect(filters?.date).toBeInstanceOf(Date);
    expect(filters?.date?.toISOString()).toContain("2026-03-21");
  });

  it("does not pass date filter when not provided", async () => {
    await useCase.execute({ businessId: BIZ_ID });

    const filters = vi.mocked(repo.findByBusiness).mock.calls[0][1];
    expect(filters?.date).toBeUndefined();
  });

  it("passes status filter to findByBusiness when provided", async () => {
    await useCase.execute({ businessId: BIZ_ID, status: "PENDING" });

    const filters = vi.mocked(repo.findByBusiness).mock.calls[0][1];
    expect(filters?.status).toBe("PENDING");
  });

  it("passes serviceId filter to findByBusiness when provided", async () => {
    await useCase.execute({ businessId: BIZ_ID, serviceId: SVC_ID });

    const filters = vi.mocked(repo.findByBusiness).mock.calls[0][1];
    expect(filters?.serviceId?.value).toBe(SVC_ID);
  });

  it("returns DTOs with correct structure", async () => {
    repo = buildMockRepo([PENDING_APT]);
    useCase = new ListAppointments(repo);

    const result = await useCase.execute({ businessId: BIZ_ID });

    expect(result[0].businessId).toBe(BIZ_ID);
    expect(result[0].status).toBe("PENDING");
    expect(result[0].id).toBeDefined();
  });
});
