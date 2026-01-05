import { DomainException } from '../exceptions/domain-exception';

export class InvalidWeekNumberError extends DomainException {
  readonly code = 'INVALID_WEEK_NUMBER' as const;
}

export class WeekNumber {
  readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || value < 1 || value > 52) {
      throw new InvalidWeekNumberError('Week number must be between 1 and 52');
    }
    this.value = value;
  }

  equals(other: WeekNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `${this.value}주차`;
  }

  toNumber(): number {
    return this.value;
  }
}
