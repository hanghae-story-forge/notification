// Common Domain Types - 공통 도메인 타입 정의

// Entity ID를 위한 기반 클래스
export abstract class EntityId {
  protected constructor(public readonly value: number) {
    if (value < 0) {
      throw new Error('ID must be a non-negative number');
    }
  }

  // 새 엔티티 생성용 임시 ID (저장 전)
  static createTemp(): EntityId {
    return new (class extends EntityId {})(0);
  }

  // 저장되지 않은 엔티티인지 확인
  isTemp(): boolean {
    return this.value === 0;
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

// 도메인 이벤트 기반 클래스
export abstract class DomainEvent {
  readonly occurredAt: Date;

  constructor() {
    this.occurredAt = new Date();
  }
}

// Aggregate Root 기반 클래스
export abstract class AggregateRoot<ID extends EntityId> {
  protected constructor(public readonly id: ID) {}

  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}

// 결과 객체 (Result Pattern)
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export const Result = {
  ok: <T>(value: T): Result<T> => ({ success: true, value }),
  fail: <E = Error>(error: E): Result<never, E> => ({
    success: false,
    error,
  }),
};

// 페이지네이션
export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
