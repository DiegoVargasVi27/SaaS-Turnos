import { RefreshToken } from "../entities/RefreshToken";
import { TokenIdVO } from "../valueObjects/TokenIdVO";

export interface TokenRepository {
  create(token: RefreshToken): Promise<void>;
  findActiveByHash(hash: string): Promise<RefreshToken | null>;
  revoke(tokenId: TokenIdVO, revokedAt: Date): Promise<void>;
  rotate(previousTokenId: TokenIdVO, newToken: RefreshToken, revokedAt: Date): Promise<void>;
}
