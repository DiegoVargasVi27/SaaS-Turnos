import { IdentityUser, BusinessLinkSnapshot } from "../entities/IdentityUser";
import { EmailVO } from "../valueObjects/EmailVO";
import { UserIdVO } from "../valueObjects/UserIdVO";

export interface RegisterUserData {
  fullName: string;
  email: EmailVO;
  passwordHash: string;
  businessName: string;
  businessSlug: string;
}

export interface CreatedOwnerResult {
  user: IdentityUser;
  business: { id: string; slug: string; name: string };
}

export interface IdentityUserRepository {
  findByEmail(email: EmailVO): Promise<IdentityUser | null>;
  findById(id: UserIdVO): Promise<IdentityUser | null>;
  findPrimaryBusinessLink(userId: UserIdVO): Promise<BusinessLinkSnapshot | null>;
  createOwnerWithBusiness(data: RegisterUserData): Promise<CreatedOwnerResult>;
}
