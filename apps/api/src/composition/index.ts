import { PrismaClient } from "@prisma/client";
import { RegisterUser } from "../application/identity/RegisterUser";
import { LoginUser } from "../application/identity/LoginUser";
import { RefreshSession } from "../application/identity/RefreshSession";
import { RevokeToken } from "../application/identity/RevokeToken";
import { PrismaIdentityUserRepository } from "../infrastructure/persistence/prisma/identity/PrismaIdentityUserRepository";
import { PrismaTokenRepository } from "../infrastructure/persistence/prisma/identity/PrismaTokenRepository";
import { BcryptPasswordHasher } from "../infrastructure/security/BcryptPasswordHasher";
import { JwtTokenService } from "../infrastructure/security/JwtTokenService";
import { createIdentityRouter } from "../controllers/identity";
import { PrismaCatalogServiceRepository } from "../infrastructure/persistence/prisma/catalog/PrismaCatalogServiceRepository";
import { PrismaAvailabilityRuleRepository } from "../infrastructure/persistence/prisma/scheduling/PrismaAvailabilityRuleRepository";
import { PrismaAppointmentRepository } from "../infrastructure/persistence/prisma/scheduling/PrismaAppointmentRepository";
import { SchedulingService } from "../domain/scheduling/services/SchedulingService";
import { ServiceAvailabilityReader } from "../application/scheduling/ServiceAvailabilityReader";
import { ListCatalogServices } from "../application/catalog/ListCatalogServices";
import { GetServiceAvailability } from "../application/catalog/GetServiceAvailability";
import { BookAppointment } from "../application/scheduling/BookAppointment";
import {
  createCatalogPublicRouter,
  createSchedulingAppointmentRouter,
  createSchedulingSlotsRouter,
} from "../controllers";

export interface ModuleContext {
  prisma: PrismaClient;
  refreshTokenTtlDays: number;
  clock?: () => Date;
}

export function buildIdentityModule(context: ModuleContext) {
  const identityRepo = new PrismaIdentityUserRepository(context.prisma);
  const tokenRepo = new PrismaTokenRepository(context.prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService();
  const refreshTtlMs = context.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  const clock = context.clock ?? (() => new Date());

  const registerUser = new RegisterUser(
    identityRepo,
    tokenRepo,
    passwordHasher,
    tokenService,
    refreshTtlMs,
    clock,
  );
  const loginUser = new LoginUser(
    identityRepo,
    tokenRepo,
    passwordHasher,
    tokenService,
    refreshTtlMs,
    clock,
  );
  const refreshSession = new RefreshSession(identityRepo, tokenRepo, tokenService, refreshTtlMs, clock);
  const revokeToken = new RevokeToken(tokenRepo, tokenService, clock);

  const router = createIdentityRouter({ registerUser, loginUser, refreshSession, revokeToken });

  return { router };
}

export interface CatalogSchedulingModuleContext {
  prisma: PrismaClient;
  clock?: () => Date;
}

export function buildCatalogSchedulingModule(context: CatalogSchedulingModuleContext) {
  const catalogRepo = new PrismaCatalogServiceRepository(context.prisma);
  const availabilityRepo = new PrismaAvailabilityRuleRepository(context.prisma);
  const appointmentRepo = new PrismaAppointmentRepository(context.prisma);
  const schedulingService = new SchedulingService();
  const availabilityReader = new ServiceAvailabilityReader(availabilityRepo, appointmentRepo, schedulingService);

  const listCatalogServices = new ListCatalogServices(catalogRepo, availabilityReader, context.clock);
  const getServiceAvailability = new GetServiceAvailability(catalogRepo, availabilityReader);
  const bookAppointment = new BookAppointment(
    context.prisma,
    catalogRepo,
    availabilityRepo,
    appointmentRepo,
    schedulingService,
  );

  return {
    publicRouter: createCatalogPublicRouter({ listCatalogServices }),
    slotsRouter: createSchedulingSlotsRouter({ getServiceAvailability }),
    appointmentRouter: createSchedulingAppointmentRouter({ bookAppointment }),
  };
}
