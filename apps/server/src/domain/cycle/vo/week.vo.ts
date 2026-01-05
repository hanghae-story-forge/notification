// Value Object: Week (주차)

import { DomainError } from '../../common/errors';

export class Week {
  private constructor(public readonly value: number) {
    if (value < 1) {
      throw new InvalidWeekError(value);
    }
    if (value > 52) {
      throw new InvalidWeekError(value);
    }
  }

  static create(value: number): Week {
    return new Week(value);
  }

  equals(other: Week): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `${this.value}주차`;
  }

  toNumber(): number {
    return this.value;
  }
}

export class InvalidWeekError extends DomainError {
  readonly code = 'INVALID_WEEK' as const;

  constructor(week: number) {
    super(`Week must be between 1 and 52, got ${week}`);
  }
}
