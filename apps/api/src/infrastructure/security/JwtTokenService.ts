import { Role } from "@prisma/client";
import { TokenService, TokenPayload, RefreshTokenPayload } from "../../application/identity/ports/TokenService";
import { UserIdVO } from "../../domain/identity/valueObjects/UserIdVO";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/auth";

export class JwtTokenService implements TokenService {
  signAccessToken(payload: TokenPayload): string {
    return signAccessToken({
      sub: payload.userId.value,
      businessId: payload.businessId,
      role: payload.role as Role,
    });
  }

  signRefreshToken(userId: UserIdVO): string {
    return signRefreshToken(userId.value);
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = verifyRefreshToken(token);
    return { userId: UserIdVO.fromString(payload.sub) };
  }
}
