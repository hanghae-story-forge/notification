// Cycle Domain - 사이클(주차) 도메인

import { EntityId, AggregateRoot } from '../common/types';

// Cycle ID
export class CycleId extends EntityId {
  static create(value: number): CycleId {
    return new CycleId(value);
  }
}

// 사이클 엔티티 (간단 버전 - 추후 확장)
export class Cycle extends AggregateRoot<CycleId> {
  private constructor(
    id: CycleId,
    private readonly _week: number,
    private readonly _startDate: Date,
    private readonly _endDate: Date,
    private readonly _githubIssueUrl?: string
  ) {
    super(id);
  }

  static create(data: {
    id: number;
    week: number;
    startDate: Date;
    endDate: Date;
    githubIssueUrl?: string;
  }): Cycle {
    return new Cycle(
      CycleId.create(data.id),
      data.week,
      data.startDate,
      data.endDate,
      data.githubIssueUrl
    );
  }

  get week(): number {
    return this._week;
  }

  get startDate(): Date {
    return new Date(this._startDate);
  }

  get endDate(): Date {
    return new Date(this._endDate);
  }

  get githubIssueUrl(): string | undefined {
    return this._githubIssueUrl;
  }

  /**
   * 마감까지 남은 시간 (시간 단위)
   */
  getHoursRemaining(): number {
    return Math.floor(
      (this._endDate.getTime() - Date.now()) / (1000 * 60 * 60)
    );
  }

  toDTO(): CycleDTO {
    return {
      id: this.id.value,
      week: this._week,
      startDate: this._startDate.toISOString(),
      endDate: this._endDate.toISOString(),
      githubIssueUrl: this._githubIssueUrl,
    };
  }
}

export interface CycleDTO {
  id: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl?: string;
}
