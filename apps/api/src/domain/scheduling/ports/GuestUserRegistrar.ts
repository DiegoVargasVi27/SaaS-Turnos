import { UserId } from "../../shared/types/UserId";
import { BusinessId } from "../../shared/types/BusinessId";

export interface GuestUserData {
  email: string;
  fullName: string;
  phone?: string;
}

/**
 * Anti-Corruption Layer port for guest user registration.
 *
 * The Scheduling bounded context needs to ensure a guest user exists
 * when booking an appointment, but should NOT know about the Identity
 * context's domain model or infrastructure (Prisma, password hashing, etc.).
 *
 * This port abstracts that cross-context concern.
 */
export interface GuestUserRegistrar {
  /**
   * Ensure a guest user exists for the given business.
   * Creates the user if not found, updates name/phone if found.
   * Associates user with business as CLIENT role.
   *
   * @returns UserId of the existing or newly created user
   */
  ensureGuestUser(businessId: BusinessId, data: GuestUserData): Promise<UserId>;
}
