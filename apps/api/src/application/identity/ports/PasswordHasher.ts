import { PasswordHashVO } from "../../../domain/identity/valueObjects/PasswordHashVO";

export interface PasswordHasher {
  hash(plain: string): Promise<PasswordHashVO>;
  compare(plain: string, hash: PasswordHashVO): Promise<boolean>;
}
