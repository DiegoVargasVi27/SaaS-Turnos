import { ValueObject } from "../../../shared/interfaces/ValueObject";

/**
 * Money value object representing monetary amounts.
 * Stores amount in cents to avoid floating point precision issues.
 * Immutable.
 */
export class Money implements ValueObject {
  private constructor(
    private readonly _amountCents: number,
    private readonly _currency: string
  ) {}

  /**
   * Create Money from cents amount.
   * @param amountCents - Amount in cents (e.g., 2500 = $25.00)
   * @param currency - ISO 4217 currency code (e.g., "USD", "EUR")
   */
  static create(amountCents: number, currency: string = "USD"): Money {
    // Validation: amount must be non-negative
    if (amountCents < 0) {
      throw new Error("Money amount cannot be negative");
    }

    // Validation: amount must be an integer (cents)
    if (!Number.isInteger(amountCents)) {
      throw new Error("Money amount must be an integer (cents)");
    }

    // Validation: currency must be valid ISO 4217 code (3 uppercase letters)
    const currencyUpper = currency.toUpperCase();
    if (currencyUpper.length !== 3 || !/^[A-Z]{3}$/.test(currencyUpper)) {
      throw new Error(`Invalid currency code: ${currency}. Must be 3-letter ISO 4217 code.`);
    }

    return new Money(amountCents, currencyUpper);
  }

  get amountCents(): number {
    return this._amountCents;
  }

  get currency(): string {
    return this._currency;
  }

  /**
   * Get amount in major currency units (e.g., dollars)
   */
  get amountMajor(): number {
    return this._amountCents / 100;
  }

  equals(other: Money): boolean {
    return (
      this._amountCents === other._amountCents &&
      this._currency === other._currency
    );
  }

  /**
   * Business rule: compare prices in same currency
   */
  isGreaterThan(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new Error(
        `Cannot compare money with different currencies: ${this._currency} vs ${other._currency}`
      );
    }
    return this._amountCents > other._amountCents;
  }

  /**
   * Business rule: add amounts in same currency
   */
  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error(
        `Cannot add money with different currencies: ${this._currency} vs ${other._currency}`
      );
    }
    return Money.create(this._amountCents + other._amountCents, this._currency);
  }

  toString(): string {
    return `${this._currency} ${this.amountMajor.toFixed(2)}`;
  }
}
