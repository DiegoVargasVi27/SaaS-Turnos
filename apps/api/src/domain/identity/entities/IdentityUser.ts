import { Role } from "@prisma/client";
import { UserIdVO } from "../valueObjects/UserIdVO";
import { EmailVO } from "../valueObjects/EmailVO";
import { PasswordHashVO } from "../valueObjects/PasswordHashVO";

export interface BusinessLinkSnapshot {
  businessId: string;
  role: Role;
}

export interface IdentityUserProps {
  id: UserIdVO;
  email: EmailVO;
  passwordHash: PasswordHashVO;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
}

export class IdentityUser {
  constructor(private readonly props: IdentityUserProps) {}

  get id(): UserIdVO {
    return this.props.id;
  }

  get email(): EmailVO {
    return this.props.email;
  }

  get passwordHash(): PasswordHashVO {
    return this.props.passwordHash;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
