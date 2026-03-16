import { TokenIdVO } from "../valueObjects/TokenIdVO";
import { UserIdVO } from "../valueObjects/UserIdVO";
import { RefreshTokenVO } from "../valueObjects/RefreshTokenVO";

export interface RefreshTokenProps {
  id: TokenIdVO;
  userId: UserIdVO;
  value: RefreshTokenVO;
  revokedAt?: Date | null;
  createdAt?: Date;
}

export class RefreshToken {
  constructor(private readonly props: RefreshTokenProps) {}

  static issue(userId: UserIdVO, value: RefreshTokenVO, now: Date): RefreshToken {
    return new RefreshToken({
      id: TokenIdVO.create(),
      userId,
      value,
      createdAt: now,
    });
  }

  get id(): TokenIdVO {
    return this.props.id;
  }

  get userId(): UserIdVO {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.value.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.value.expiresAt;
  }

  get revokedAt(): Date | null | undefined {
    return this.props.revokedAt ?? null;
  }

  isActive(now: Date): boolean {
    return !this.revokedAt && this.expiresAt.getTime() > now.getTime();
  }
}
