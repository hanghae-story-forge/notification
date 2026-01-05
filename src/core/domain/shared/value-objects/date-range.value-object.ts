import { DomainException } from '../exceptions/domain-exception';

export class InvalidDateRangeError extends DomainException {
  readonly code = 'INVALID_DATE_RANGE' as const;
}

export class DateRange {
  readonly startDate: Date;
  readonly endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    if (startDate >= endDate) {
      throw new InvalidDateRangeError('Start date must be before end date');
    }
    this.startDate = startDate;
    this.endDate = endDate;
  }

  get durationInDays(): number {
    return Math.ceil(
      (this.endDate.getTime() - this.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && this.endDate >= other.startDate;
  }

  isActive(): boolean {
    const now = new Date();
    return this.contains(now);
  }

  getHoursUntilDeadline(): number {
    const now = new Date();
    const deadline = this.endDate;
    return (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  equals(other: DateRange): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }
}
