import {
  CyclePeriod,
  GenerationParticipant,
  GithubDriftPolicy,
  GithubManualChangeType,
  StudyCycle,
  StudyGeneration,
  StudyOperationsDomainError,
  SubmissionPolicy,
  SubmissionTimingStatus,
} from '../../domain/study-operations';

export interface StudyGenerationRepository {
  save(generation: StudyGeneration): Promise<StudyGeneration>;
}

export interface StudyCycleRepository {
  findById(id: number): Promise<StudyCycle | null>;
  save(cycle: StudyCycle): Promise<StudyCycle>;
}

export interface GenerationParticipantRepository {
  findById(id: number): Promise<GenerationParticipant | null>;
  findByGenerationAndMember(
    generationId: number,
    memberId: number
  ): Promise<GenerationParticipant | null>;
  findByGenerationAndStatus(
    generationId: number,
    status: GenerationParticipant['status']
  ): Promise<GenerationParticipant[]>;
  save(participant: GenerationParticipant): Promise<GenerationParticipant>;
}

export interface OutboxPort {
  publish(eventType: string, payload: Record<string, unknown>): Promise<void>;
}

export interface CreateStudyGenerationRequest {
  studyId: number;
  organizationId: number;
  ordinal: number;
  displayName: string;
  plannedCycleCount?: number;
  cycleDurationDays?: number;
}

export class CreateStudyGenerationCommand {
  constructor(
    private readonly generationRepository: StudyGenerationRepository,
    private readonly outbox: OutboxPort
  ) {}

  async execute(request: CreateStudyGenerationRequest): Promise<StudyGeneration> {
    const generation = StudyGeneration.create(request);
    const saved = await this.generationRepository.save(generation);
    await this.outbox.publish('GenerationCreated', {
      studyId: saved.studyId,
      organizationId: saved.organizationId,
      ordinal: saved.ordinal,
      displayName: saved.displayName,
    });
    return saved;
  }
}

export interface ScheduleStudyCycleRequest {
  generationId: number;
  sequence: number;
  startAt: Date;
  endAt: Date;
}

export class ScheduleStudyCycleCommand {
  constructor(
    private readonly cycleRepository: StudyCycleRepository,
    private readonly outbox: OutboxPort
  ) {}

  async execute(request: ScheduleStudyCycleRequest): Promise<StudyCycle> {
    const cycle = StudyCycle.create({
      generationId: request.generationId,
      sequence: request.sequence,
      period: CyclePeriod.create(request.startAt, request.endAt),
    });
    cycle.schedule();
    const saved = await this.cycleRepository.save(cycle);
    await this.outbox.publish('CycleScheduled', {
      generationId: request.generationId,
      sequence: request.sequence,
      startAt: request.startAt.toISOString(),
      endAt: request.endAt.toISOString(),
    });
    return saved;
  }
}

export interface RecordSubmissionEligibilityRequest {
  participantId: number;
  cycleId: number;
  submittedAt: Date;
}

export interface RecordSubmissionEligibilityResult {
  canSubmit: boolean;
  timingStatus: SubmissionTimingStatus;
}

export interface ApplyToGenerationRequest {
  generationId: number;
  memberId: number;
}

export interface ListGenerationApplicationsRequest {
  generationId: number;
}

export class ListGenerationApplicationsQuery {
  constructor(
    private readonly participantRepository: GenerationParticipantRepository
  ) {}

  async execute(
    request: ListGenerationApplicationsRequest
  ): Promise<GenerationParticipant[]> {
    return this.participantRepository.findByGenerationAndStatus(
      request.generationId,
      'APPLIED'
    );
  }
}

export class ApplyToGenerationCommand {
  constructor(
    private readonly participantRepository: GenerationParticipantRepository,
    private readonly outbox: OutboxPort
  ) {}

  async execute(request: ApplyToGenerationRequest): Promise<GenerationParticipant> {
    const existing = await this.participantRepository.findByGenerationAndMember(
      request.generationId,
      request.memberId
    );
    if (existing) {
      return existing;
    }

    const participant = GenerationParticipant.create({
      generationId: request.generationId,
      memberId: request.memberId,
      roles: ['PARTICIPANT'],
    });
    const saved = await this.participantRepository.save(participant);
    await this.outbox.publish('GenerationParticipationApplied', {
      generationId: request.generationId,
      memberId: request.memberId,
    });
    return saved;
  }
}

export interface ApproveGenerationParticipantRequest {
  participantId: number;
  approvedByMemberId: number;
}

export class ApproveGenerationParticipantCommand {
  constructor(
    private readonly participantRepository: GenerationParticipantRepository,
    private readonly outbox: OutboxPort
  ) {}

  async execute(
    request: ApproveGenerationParticipantRequest
  ): Promise<GenerationParticipant> {
    const participant = await this.participantRepository.findById(
      request.participantId
    );
    if (!participant) {
      throw new StudyOperationsDomainError('Participant not found');
    }

    participant.approve();
    participant.assignRole('PARTICIPANT');
    const saved = await this.participantRepository.save(participant);
    await this.outbox.publish('GenerationParticipationApproved', {
      participantId: request.participantId,
      approvedByMemberId: request.approvedByMemberId,
    });
    return saved;
  }
}

export class CheckRecordSubmissionEligibilityCommand {
  constructor(
    private readonly participantRepository: GenerationParticipantRepository,
    private readonly cycleRepository: StudyCycleRepository
  ) {}

  async execute(
    request: RecordSubmissionEligibilityRequest
  ): Promise<RecordSubmissionEligibilityResult> {
    const participant = await this.participantRepository.findById(
      request.participantId
    );
    if (!participant) {
      throw new StudyOperationsDomainError('Participant not found');
    }

    const cycle = await this.cycleRepository.findById(request.cycleId);
    if (!cycle) {
      throw new StudyOperationsDomainError('Cycle not found');
    }

    return {
      canSubmit: SubmissionPolicy.canSubmit(participant, cycle),
      timingStatus: SubmissionPolicy.classifyTiming(request.submittedAt, cycle),
    };
  }
}

export interface HandleGithubManualChangeRequest {
  cycleId: number;
  changeType: GithubManualChangeType;
  remoteSnapshot: Record<string, unknown>;
}

export class HandleGithubManualChangeCommand {
  constructor(
    private readonly cycleRepository: StudyCycleRepository,
    private readonly outbox: OutboxPort
  ) {}

  async execute(request: HandleGithubManualChangeRequest): Promise<void> {
    const classification = GithubDriftPolicy.classify(request.changeType);

    if (classification.action === 'CLOSE_CYCLE') {
      const cycle = await this.cycleRepository.findById(request.cycleId);
      if (!cycle) {
        throw new StudyOperationsDomainError('Cycle not found');
      }
      cycle.close('GITHUB_ISSUE_CLOSED');
      await this.cycleRepository.save(cycle);
      await this.outbox.publish('CycleClosed', {
        cycleId: request.cycleId,
        source: 'GITHUB_ISSUE_CLOSED',
      });
      return;
    }

    await this.outbox.publish('GithubDriftDetected', {
      cycleId: request.cycleId,
      changeType: classification.reason,
      remoteSnapshot: request.remoteSnapshot,
    });
  }
}
