import { Entity } from "../../../shared/interfaces/Entity";
import { ServiceId } from "../../../shared/types/ServiceId";
import { BusinessId } from "../../../shared/types/BusinessId";
import { ServiceName } from "./ServiceName";
import { Duration } from "./Duration";
import { Money } from "./Money";

/**
 * Service aggregate root.
 * Represents a bookable service offered by a business.
 * 
 * Business rules:
 * - Service must have a valid name, duration, and price
 * - Inactive services cannot be booked
 * - Service belongs to exactly one business
 */
export class Service implements Entity {
  private constructor(
    private readonly _id: ServiceId,
    private readonly _businessId: BusinessId,
    private _name: ServiceName,
    private _duration: Duration,
    private _price: Money,
    private _isActive: boolean,
    private readonly _createdAt: Date
  ) {}

  /**
   * Factory method to create a new Service.
   * Use this when creating a service for the first time.
   */
  static create(
    businessId: BusinessId,
    name: string,
    durationMinutes: number,
    priceCents: number,
    currency?: string
  ): Service {
    // Value object constructors handle validation
    return new Service(
      ServiceId.create(),
      businessId,
      ServiceName.create(name),
      Duration.fromMinutes(durationMinutes),
      Money.create(priceCents, currency),
      true, // New services are active by default
      new Date()
    );
  }

  /**
   * Factory method to reconstitute a Service from persistence.
   * Use this when loading from database.
   */
  static reconstitute(
    id: string,
    businessId: string,
    name: string,
    durationMinutes: number,
    priceCents: number,
    currency: string,
    isActive: boolean,
    createdAt: Date
  ): Service {
    return new Service(
      ServiceId.fromString(id),
      BusinessId.fromString(businessId),
      ServiceName.create(name),
      Duration.fromMinutes(durationMinutes),
      Money.create(priceCents, currency),
      isActive,
      createdAt
    );
  }

  // Getters
  get id(): ServiceId {
    return this._id;
  }

  get businessId(): BusinessId {
    return this._businessId;
  }

  get name(): ServiceName {
    return this._name;
  }

  get duration(): Duration {
    return this._duration;
  }

  get price(): Money {
    return this._price;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // Business methods

  /**
   * Update the service name.
   * Validates the new name through the ServiceName value object.
   */
  updateName(newName: string): void {
    this._name = ServiceName.create(newName);
  }

  /**
   * Update the service duration.
   * Validates the new duration through the Duration value object.
   */
  updateDuration(newDurationMinutes: number): void {
    this._duration = Duration.fromMinutes(newDurationMinutes);
  }

  /**
   * Update the service price.
   * Validates the new price through the Money value object.
   * Currency can be changed, but usually should remain consistent.
   */
  updatePrice(newPriceCents: number, currency?: string): void {
    this._price = Money.create(newPriceCents, currency || this._price.currency);
  }

  /**
   * Deactivate the service.
   * Inactive services cannot be booked by clients.
   * Existing appointments remain valid.
   */
  deactivate(): void {
    this._isActive = false;
  }

  /**
   * Activate the service.
   * Allows the service to be booked again.
   */
  activate(): void {
    this._isActive = true;
  }

  /**
   * Business rule: Check if service can be booked.
   * Only active services can be booked for new appointments.
   */
  canBeBooked(): boolean {
    return this._isActive;
  }

  /**
   * Entity equality: two services are equal if they have the same ID.
   */
  equals(other: Service): boolean {
    return this._id.equals(other._id);
  }
}
