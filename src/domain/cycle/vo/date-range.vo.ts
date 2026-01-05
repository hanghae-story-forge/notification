// Value Object: DateRange (날짜 범위)

import { DomainError } from '../../common/errors';

export class DateRange {
  private constructor(
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {
    if (startDate > endDate) {
      throw new InvalidDateRangeError(startDate, endDate);
    }
  }

  static create(startDate: Date, endDate: Date): DateRange {
    // Date 객체 복사하여 불변성 보장
    const start = new Date(startDate);
    const end = new Date(endDate);
    return new DateRange(start, end);
  }

  static fromWeek(startDate: Date): DateRange {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return new DateRange(start, end);
  }

  equals(other: DateRange): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }

  /**
   * 마감까지 남은 시간 (시간 단위)
   */
  getHoursRemaining(): number {
    const now = Date.now();
    const deadline = this.endDate.getTime();
    return Math.floor((deadline - now) / (1000 * 60 * 60));
  }

  /**
   * 마감까지 남은 일수
   */
  getDaysRemaining(): number {
    return Math.floor(this.getHoursRemaining() / 24);
  }

  /**
   * 마감이 지났는지 확인
   */
  isPast(): boolean {
    return this.getHoursRemaining() < 0;
  }

  /**
   * 현재 진행 중인지 확인
   */
  isActive(): boolean {
    const now = Date.now();
    return (
      this.startDate.getTime() <= now && this.endDate.getTime() >= now
    );
  }

  toDTO(): DateRangeDTO {
    return {
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
    };
  }
}

export class InvalidDateRangeError extends DomainError {
  readonly code = 'INVALID_DATE_RANGE' as const;

  constructor(startDate: Date, endDate: Date) {
    super(
      `Start date (${startDate.toISOString()}) must be before end date (${endDate.toISOString()})`
    );
  }
}

export interface DateRangeDTO {
  startDate: string;
  endDate: string;
}
