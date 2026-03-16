import { Role } from "@prisma/client";
import { UserIdVO } from "../../../domain/identity/valueObjects/UserIdVO";

export interface TokenPayload {
  userId: UserIdVO;
  businessId: string;
  role: Role;
}

export interface RefreshTokenPayload {
  userId: UserIdVO;
}

export interface TokenService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(userId: UserIdVO): string;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
