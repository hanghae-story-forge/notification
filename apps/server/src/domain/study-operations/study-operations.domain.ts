export type GenerationStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type CycleStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'OPEN'
  | 'CLOSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ParticipantStatus =
  | 'APPLIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'INACTIVE'
  | 'REMOVED';

export type ParticipantRole = 'OWNER' | 'MANAGER' | 'PARTICIPANT' | 'OBSERVER';

export type SubmissionTimingStatus =
  | 'ON_TIME'
  | 'LATE_PENDING_APPROVAL'
  | 'LATE_APPROVED'
  | 'LATE_REJECTED';

export type GithubManualChangeType =
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_DATE_CHANGED'
  | 'ISSUE_TITLE_CHANGED'
  | 'ISSUE_BODY_CHANGED'
  | 'ISSUE_LABEL_CHANGED'
  | 'ISSUE_CLOSED';

export class StudyOperationsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudyOperationsDomainError';
  }
}

export interface StudyOperationsEvent {
  readonly type: string;
  readonly occurredAt: Date;
}

function event(type: string): StudyOperationsEvent {
  return { type, occurredAt: new Date() };
}

export class CyclePeriod {
  private constructor(
    public readonly startAt: Date,
    public readonly endAt: Date
  ) {}

  static create(startAt: Date, endAt: Date): CyclePeriod {
    if (startAt.getTime() >= endAt.getTime()) {
      throw new StudyOperationsDomainError(
        'Cycle startAt must be before endAt'
      );
    }
    return new CyclePeriod(new Date(startAt), new Date(endAt));
  }

  durationDays(): number {
    return Math.ceil(
      (this.endAt.getTime() - this.startAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  contains(date: Date): boolean {
    const time = date.getTime();
    return time >= this.startAt.getTime() && time <= this.endAt.getTime();
  }
}

export interface GenerationProps {
  id?: number;
  studyId: number;
  organizationId: number;
  ordinal: number;
  displayName: string;
  status?: GenerationStatus;
  plannedCycleCount?: number;
  cycleDurationDays?: number;
  inactiveThresholdMissedCycles?: number;
}

export class StudyGeneration {
  private readonly events: StudyOperationsEvent[] = [];
  readonly id?: number;
  readonly studyId: number;
  readonly organizationId: number;
  readonly ordinal: number;
  readonly displayName: string;
  readonly plannedCycleCount: number;
  readonly cycleDurationDays: number;
  readonly inactiveThresholdMissedCycles: number;
  private _status: GenerationStatus;

  private constructor(
    props: Required<Omit<GenerationProps, 'id'>> & { id?: number }
  ) {
    this.id = props.id;
    this.studyId = props.studyId;
    this.organizationId = props.organizationId;
    this.ordinal = props.ordinal;
    this.displayName = props.displayName;
    this._status = props.status;
    this.plannedCycleCount = props.plannedCycleCount;
    this.cycleDurationDays = props.cycleDurationDays;
    this.inactiveThresholdMissedCycles = props.inactiveThresholdMissedCycles;
  }

  static create(props: GenerationProps): StudyGeneration {
    if (props.ordinal < 1) {
      throw new StudyOperationsDomainError(
        'Generation ordinal must be positive'
      );
    }
    if (props.displayName.trim().length === 0) {
      throw new StudyOperationsDomainError(
        'Generation displayName cannot be empty'
      );
    }
    const generation = new StudyGeneration({
      id: props.id,
      studyId: props.studyId,
      organizationId: props.organizationId,
      ordinal: props.ordinal,
      displayName: props.displayName.trim(),
      status: props.status ?? 'DRAFT',
      plannedCycleCount: props.plannedCycleCount ?? 8,
      cycleDurationDays: props.cycleDurationDays ?? 14,
      inactiveThresholdMissedCycles: props.inactiveThresholdMissedCycles ?? 3,
    });
    generation.events.push(event('GenerationCreated'));
    return generation;
  }

  get status(): GenerationStatus {
    return this._status;
  }

  get domainEvents(): StudyOperationsEvent[] {
    return [...this.events];
  }

  isFrozen(): boolean {
    return this._status === 'COMPLETED' || this._status === 'CANCELLED';
  }

  plan(): void {
    this.ensureNotFrozen();
    if (this._status !== 'DRAFT') {
      throw new StudyOperationsDomainError(
        'Only DRAFT generation can be planned'
      );
    }
    this._status = 'PLANNED';
    this.events.push(event('GenerationPlanned'));
  }

  activate(): void {
    this.ensureNotFrozen();
    if (this._status !== 'PLANNED') {
      throw new StudyOperationsDomainError(
        'Only PLANNED generation can be activated'
      );
    }
    this._status = 'ACTIVE';
    this.events.push(event('GenerationActivated'));
  }

  complete(): void {
    if (this._status !== 'ACTIVE' && this._status !== 'PLANNED') {
      throw new StudyOperationsDomainError(
        'Only PLANNED or ACTIVE generation can be completed'
      );
    }
    this._status = 'COMPLETED';
    this.events.push(event('GenerationCompleted'));
  }

  cancel(): void {
    this.ensureNotFrozen();
    this._status = 'CANCELLED';
    this.events.push(event('GenerationCancelled'));
  }

  assertMutable(): void {
    this.ensureNotFrozen();
  }

  private ensureNotFrozen(): void {
    if (this.isFrozen()) {
      throw new StudyOperationsDomainError(
        'Frozen generation cannot be modified'
      );
    }
  }
}

export interface CycleProps {
  id?: number;
  generationId: number;
  sequence: number;
  period: CyclePeriod;
  status?: CycleStatus;
  githubIssueUrl?: string;
}

export class StudyCycle {
  private readonly events: StudyOperationsEvent[] = [];
  readonly id?: number;
  readonly generationId: number;
  readonly sequence: number;
  private _period: CyclePeriod;
  private _status: CycleStatus;
  githubIssueUrl?: string;

  private constructor(props: CycleProps) {
    this.id = props.id;
    this.generationId = props.generationId;
    this.sequence = props.sequence;
    this._period = props.period;
    this._status = props.status ?? 'DRAFT';
    this.githubIssueUrl = props.githubIssueUrl;
  }

  static create(props: CycleProps): StudyCycle {
    if (props.sequence < 1) {
      throw new StudyOperationsDomainError('Cycle sequence must be positive');
    }
    const cycle = new StudyCycle(props);
    cycle.events.push(event('CycleCreated'));
    return cycle;
  }

  get period(): CyclePeriod {
    return this._period;
  }

  get status(): CycleStatus {
    return this._status;
  }

  get domainEvents(): StudyOperationsEvent[] {
    return [...this.events];
  }

  reschedule(period: CyclePeriod): void {
    if (this._status !== 'DRAFT') {
      throw new StudyOperationsDomainError(
        'Cycle period cannot be changed after scheduling'
      );
    }
    this._period = period;
    this.events.push(event('CycleRescheduled'));
  }

  schedule(): void {
    if (this._status !== 'DRAFT') {
      throw new StudyOperationsDomainError('Only DRAFT cycle can be scheduled');
    }
    this._status = 'SCHEDULED';
    this.events.push(event('CycleScheduled'));
  }

  open(now = new Date()): void {
    if (this._status !== 'SCHEDULED') {
      throw new StudyOperationsDomainError(
        'Only SCHEDULED cycle can be opened'
      );
    }
    if (now.getTime() < this._period.startAt.getTime()) {
      throw new StudyOperationsDomainError(
        'Cycle cannot be opened before startAt'
      );
    }
    this._status = 'OPEN';
    this.events.push(event('CycleOpened'));
  }

  close(
    source: 'SYSTEM' | 'GITHUB_ISSUE_CLOSED' | 'OPERATOR' = 'SYSTEM'
  ): void {
    if (this._status !== 'OPEN' && this._status !== 'SCHEDULED') {
      throw new StudyOperationsDomainError(
        'Only SCHEDULED or OPEN cycle can be closed'
      );
    }
    this._status = 'CLOSED';
    this.events.push(
      event(
        source === 'GITHUB_ISSUE_CLOSED'
          ? 'CycleClosedByGithubIssue'
          : 'CycleClosed'
      )
    );
  }

  complete(): void {
    if (this._status !== 'CLOSED') {
      throw new StudyOperationsDomainError(
        'Only CLOSED cycle can be completed'
      );
    }
    this._status = 'COMPLETED';
    this.events.push(event('CycleCompleted'));
  }
}

export interface GenerationParticipantProps {
  id?: number;
  generationId: number;
  memberId: number;
  status?: ParticipantStatus;
  roles?: ParticipantRole[];
  consecutiveMissedCycles?: number;
}

export class GenerationParticipant {
  readonly id?: number;
  readonly generationId: number;
  readonly memberId: number;
  private _status: ParticipantStatus;
  private readonly roleSet: Set<ParticipantRole>;
  private _consecutiveMissedCycles: number;
  private readonly events: StudyOperationsEvent[] = [];

  private constructor(props: GenerationParticipantProps) {
    this.id = props.id;
    this.generationId = props.generationId;
    this.memberId = props.memberId;
    this._status = props.status ?? 'APPLIED';
    this.roleSet = new Set(props.roles ?? []);
    this._consecutiveMissedCycles = props.consecutiveMissedCycles ?? 0;
  }

  static create(props: GenerationParticipantProps): GenerationParticipant {
    return new GenerationParticipant(props);
  }

  get status(): ParticipantStatus {
    return this._status;
  }

  get roles(): ParticipantRole[] {
    return Array.from(this.roleSet);
  }

  get consecutiveMissedCycles(): number {
    return this._consecutiveMissedCycles;
  }

  get domainEvents(): StudyOperationsEvent[] {
    return [...this.events];
  }

  hasRole(role: ParticipantRole): boolean {
    return this.roleSet.has(role);
  }

  assignRole(role: ParticipantRole): void {
    this.roleSet.add(role);
    this.events.push(event('GenerationParticipantRoleAssigned'));
  }

  approve(): void {
    if (this._status !== 'APPLIED') {
      throw new StudyOperationsDomainError(
        'Only APPLIED participant can be approved'
      );
    }
    this._status = 'APPROVED';
    this.events.push(event('GenerationParticipationApproved'));
  }

  markMissedCycle(threshold = 3): void {
    if (this._status !== 'APPROVED') {
      return;
    }
    this._consecutiveMissedCycles += 1;
    if (this._consecutiveMissedCycles >= threshold) {
      this._status = 'INACTIVE';
      this.events.push(event('GenerationParticipantMarkedInactive'));
    }
  }

  recordSubmission(): void {
    this._consecutiveMissedCycles = 0;
  }

  reactivateByOperator(): void {
    if (this._status !== 'INACTIVE') {
      throw new StudyOperationsDomainError(
        'Only INACTIVE participant can be reactivated'
      );
    }
    this._status = 'APPROVED';
    this._consecutiveMissedCycles = 0;
    this.events.push(event('GenerationParticipantReactivated'));
  }

  removeByOperator(): void {
    if (this._status !== 'APPROVED' && this._status !== 'INACTIVE') {
      throw new StudyOperationsDomainError(
        'Only APPROVED or INACTIVE participant can be removed'
      );
    }
    this._status = 'REMOVED';
    this.events.push(event('GenerationParticipantRemoved'));
  }
}

export class SubmissionPolicy {
  static canSubmit(
    participant: GenerationParticipant,
    cycle: StudyCycle
  ): boolean {
    return (
      participant.status === 'APPROVED' &&
      participant.hasRole('PARTICIPANT') &&
      cycle.status === 'OPEN'
    );
  }

  static classifyTiming(
    submittedAt: Date,
    cycle: StudyCycle
  ): SubmissionTimingStatus {
    if (submittedAt.getTime() <= cycle.period.endAt.getTime()) {
      return 'ON_TIME';
    }
    return 'LATE_PENDING_APPROVAL';
  }
}

export class ReminderPolicy {
  static readonly offsetsHours = [72, 24, 6, 2] as const;

  static dueTimes(cycle: StudyCycle): Date[] {
    return ReminderPolicy.offsetsHours.map(
      (hours) => new Date(cycle.period.endAt.getTime() - hours * 60 * 60 * 1000)
    );
  }
}

export class GithubDriftPolicy {
  static classify(
    change: GithubManualChangeType
  ):
    | { action: 'CLOSE_CYCLE' }
    | { action: 'DRIFT'; reason: GithubManualChangeType } {
    if (change === 'ISSUE_CLOSED') {
      return { action: 'CLOSE_CYCLE' };
    }
    return { action: 'DRIFT', reason: change };
  }
}
