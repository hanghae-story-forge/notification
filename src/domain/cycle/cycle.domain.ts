// Cycle Domain - 사이클(주차) 도메인

import { EntityId, AggregateRoot } from '../common/types';
import { Week } from './vo/week.vo';
import { DateRange } from './vo/date-range.vo';
import { GitHubIssueUrl } from './vo/github-issue-url.vo';

// Cycle ID
export class CycleId extends EntityId {
  static create(value: number): CycleId {
    return new CycleId(value);
  }
}

// 도메인 이벤트
export class CycleCreatedEvent {
  readonly type = 'CycleCreated' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly cycleId: CycleId,
    public readonly week: Week,
    public readonly dateRange: DateRange
  ) {
    this.occurredAt = new Date();
  }
}

// 사이클 생성 데이터
export interface CreateCycleData {
  id?: number;
  generationId: number;
  week: number;
  startDate: Date;
  endDate: Date;
  githubIssueUrl?: string;
  createdAt?: Date;
}

// 사이클 엔티티 (Aggregate Root)
export class Cycle extends AggregateRoot<CycleId> {
  private constructor(
    id: CycleId,
    private readonly _generationId: number,
    private readonly _week: Week,
    private readonly _dateRange: DateRange,
    private readonly _githubIssueUrl: GitHubIssueUrl | null,
    private readonly _createdAt: Date
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 사이클 생성
  static create(data: CreateCycleData): Cycle {
    const week = Week.create(data.week);
    const dateRange = DateRange.create(data.startDate, data.endDate);
    const githubIssueUrl = GitHubIssueUrl.createOrNull(data.githubIssueUrl);

    const id = data.id ? CycleId.create(data.id) : CycleId.create(0);
    const generationId = data.generationId;
    const createdAt = data.createdAt ?? new Date();

    const cycle = new Cycle(
      id,
      generationId,
      week,
      dateRange,
      githubIssueUrl,
      createdAt
    );

    // 도메인 이벤트 발행 (새 생성 시에만)
    if (data.id === 0) {
      cycle.addDomainEvent(new CycleCreatedEvent(id, week, dateRange));
    }

    return cycle;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    generationId: number;
    week: number;
    startDate: Date;
    endDate: Date;
    githubIssueUrl?: string;
    createdAt: Date;
  }): Cycle {
    return Cycle.create({
      id: data.id,
      generationId: data.generationId,
      week: data.week,
      startDate: data.startDate,
      endDate: data.endDate,
      githubIssueUrl: data.githubIssueUrl,
      createdAt: data.createdAt,
    });
  }

  // Getters
  get generationId(): number {
    return this._generationId;
  }

  get week(): Week {
    return this._week;
  }

  get dateRange(): DateRange {
    return this._dateRange;
  }

  get startDate(): Date {
    return new Date(this._dateRange.startDate);
  }

  get endDate(): Date {
    return new Date(this._dateRange.endDate);
  }

  get githubIssueUrl(): GitHubIssueUrl | null {
    return this._githubIssueUrl;
  }

  // 비즈니스 로직: 마감까지 남은 시간
  getHoursRemaining(): number {
    return this._dateRange.getHoursRemaining();
  }

  // 비즈니스 로직: 마감이 지났는지 확인
  isPast(): boolean {
    return this._dateRange.isPast();
  }

  // 비즈니스 로직: 현재 진행 중인지 확인
  isActive(): boolean {
    return this._dateRange.isActive();
  }

  // 비즈니스 로직: 특정 기수에 속하는지 확인
  belongsToGeneration(generationId: number): boolean {
    return this._generationId === generationId;
  }

  // DTO로 변환
  toDTO(): CycleDTO {
    return {
      id: this.id.value,
      generationId: this._generationId,
      week: this._week.toNumber(),
      startDate: this._dateRange.startDate.toISOString(),
      endDate: this._dateRange.endDate.toISOString(),
      githubIssueUrl: this._githubIssueUrl?.value ?? null,
      createdAt: this._createdAt.toISOString(),
    };
  }
}

export interface CycleDTO {
  id: number;
  generationId: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  createdAt: string;
}
