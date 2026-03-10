import { Service } from "../entities/service/Service";
import { ServiceId } from "../../shared/types/ServiceId";
import { BusinessId } from "../../shared/types/BusinessId";

/**
 * Service repository interface.
 * Defines persistence operations for the Service aggregate.
 * 
 * This interface lives in the domain layer (Dependency Inversion Principle).
 * The infrastructure layer will provide the concrete implementation.
 */
export interface IServiceRepository {
  /**
   * Save a service (create or update).
   * @param service - Service aggregate to persist
   * @returns The saved service with any updates from persistence layer
   */
  save(service: Service): Promise<Service>;

  /**
   * Find a service by its ID.
   * @param id - Service identifier
   * @returns The service if found, null otherwise
   */
  findById(id: ServiceId): Promise<Service | null>;

  /**
   * Find all services belonging to a business.
   * @param businessId - Business identifier
   * @returns Array of services, ordered by creation date (newest first)
   */
  findByBusinessId(businessId: BusinessId): Promise<Service[]>;

  /**
   * Find only active services belonging to a business.
   * @param businessId - Business identifier
   * @returns Array of active services, ordered by creation date (newest first)
   */
  findActiveByBusinessId(businessId: BusinessId): Promise<Service[]>;

  /**
   * Soft delete a service (set isActive = false).
   * @param id - Service identifier
   */
  delete(id: ServiceId): Promise<void>;

  /**
   * Check if a service exists by ID.
   * @param id - Service identifier
   * @returns true if exists, false otherwise
   */
  exists(id: ServiceId): Promise<boolean>;

  /**
   * Business rule: Check if service has future appointments.
   * Used to prevent deletion of services with pending bookings.
   * 
   * @param id - Service identifier
   * @returns true if service has any PENDING or CONFIRMED appointments
   *          scheduled in the future, false otherwise
   */
  hasFutureAppointments(id: ServiceId): Promise<boolean>;
}
