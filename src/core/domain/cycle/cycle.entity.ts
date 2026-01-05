import {
  CycleId,
  GenerationId,
  WeekNumber,
  GitHubIssueUrl,
  DateRange,
} from '../shared';

export class Cycle {
  constructor(
    private readonly _id: CycleId,
    private readonly _generationId: GenerationId,
    private readonly _week: WeekNumber,
    private readonly _dateRange: DateRange,
    private readonly _githubIssueUrl: GitHubIssueUrl | null,
    private readonly _createdAt: Date
  ) {}

  get id(): CycleId {
    return this._id;
  }

  get generationId(): GenerationId {
    return this._generationId;
  }

  get week(): WeekNumber {
    return this._week;
  }

  get dateRange(): DateRange {
    return this._dateRange;
  }

  get githubIssueUrl(): GitHubIssueUrl | null {
    return this._githubIssueUrl;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isActive(): boolean {
    return this._dateRange.isActive();
  }

  getDeadline(): Date {
    return this._dateRange.endDate;
  }

  isDeadlineWithin(hours: number): boolean {
    const hoursUntilDeadline = this._dateRange.getHoursUntilDeadline();
    return hoursUntilDeadline > 0 && hoursUntilDeadline <= hours;
  }

  getCycleName(): string {
    return this._week.toString();
  }

  static create(
    generationId: GenerationId,
    week: WeekNumber,
    dateRange: DateRange,
    githubIssueUrl: GitHubIssueUrl | null = null
  ): Cycle {
    return new Cycle(
      CycleId.create(),
      generationId,
      week,
      dateRange,
      githubIssueUrl,
      new Date()
    );
  }
}
