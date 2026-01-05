import { DomainException } from '../exceptions/domain-exception';

export class InvalidEntityIdError extends DomainException {
  readonly code = 'INVALID_ENTITY_ID' as const;

  constructor(value: unknown) {
    super(`Invalid entity ID: ${String(value)}`);
  }
}

export abstract class EntityId {
  readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
      throw new InvalidEntityIdError(value);
    }
    this.value = value;
  }

  equals(other: EntityId): boolean {
    if (this.constructor !== other.constructor) {
      return false;
    }
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
