import { PasswordHasher } from "../../application/identity/ports/PasswordHasher";
import { PasswordHashVO } from "../../domain/identity/valueObjects/PasswordHashVO";
import { comparePassword, hashPassword } from "../../lib/auth";

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<PasswordHashVO> {
    const hash = await hashPassword(plain);
    return PasswordHashVO.create(hash);
  }

  async compare(plain: string, hash: PasswordHashVO): Promise<boolean> {
    return comparePassword(plain, hash.value);
  }
}
