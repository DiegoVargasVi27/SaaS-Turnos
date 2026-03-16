import { UserId } from "../../shared/types/UserId";

export class UserIdVO {
  private constructor(private readonly inner: UserId) {}

  static create(): UserIdVO {
    return new UserIdVO(UserId.create());
  }

  static fromString(value: string): UserIdVO {
    return new UserIdVO(UserId.fromString(value));
  }

  get value(): string {
    return this.inner.value;
  }

  equals(other: UserIdVO): boolean {
    return this.inner.equals(other.inner);
  }

  toString(): string {
    return this.inner.toString();
  }
}
