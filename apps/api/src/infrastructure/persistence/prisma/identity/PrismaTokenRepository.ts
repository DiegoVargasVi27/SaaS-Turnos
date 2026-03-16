import { PrismaClient, RefreshToken as PrismaRefreshToken } from "@prisma/client";
import { TokenRepository } from "../../../../domain/identity/repositories/TokenRepository";
import { RefreshToken } from "../../../../domain/identity/entities/RefreshToken";
import { TokenIdVO } from "../../../../domain/identity/valueObjects/TokenIdVO";
import { UserIdVO } from "../../../../domain/identity/valueObjects/UserIdVO";
import { RefreshTokenVO } from "../../../../domain/identity/valueObjects/RefreshTokenVO";

export class PrismaTokenRepository implements TokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(token: PrismaRefreshToken): RefreshToken {
    return new RefreshToken({
      id: TokenIdVO.fromString(token.id),
      userId: UserIdVO.fromString(token.userId),
      value: RefreshTokenVO.create(token.tokenHash, token.expiresAt),
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    });
  }

  async create(token: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: token.id.value,
        userId: token.userId.value,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    });
  }

  async findActiveByHash(hash: string): Promise<RefreshToken | null> {
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return token ? this.toDomain(token) : null;
  }

  async revoke(tokenId: TokenIdVO, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId.value },
      data: { revokedAt },
    });
  }

  async rotate(previousTokenId: TokenIdVO, newToken: RefreshToken, revokedAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: previousTokenId.value },
        data: { revokedAt },
      }),
      this.prisma.refreshToken.create({
        data: {
          id: newToken.id.value,
          userId: newToken.userId.value,
          tokenHash: newToken.tokenHash,
          expiresAt: newToken.expiresAt,
        },
      }),
    ]);
  }
}
