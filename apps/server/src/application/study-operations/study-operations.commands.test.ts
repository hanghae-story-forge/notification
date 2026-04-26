import { describe, expect, it } from 'vitest';
import {
  CyclePeriod,
  GenerationParticipant,
  StudyCycle,
  StudyGeneration,
} from '../../domain/study-operations';
import {
  ApplyToGenerationCommand,
  ApproveGenerationParticipantCommand,
  CheckRecordSubmissionEligibilityCommand,
  CreateStudyGenerationCommand,
  GenerationParticipantRepository,
  HandleGithubManualChangeCommand,
  OutboxPort,
  ScheduleStudyCycleCommand,
  StudyCycleRepository,
  StudyGenerationRepository,
} from './study-operations.commands';

const date = (value: string) => new Date(value);

class MemoryOutbox implements OutboxPort {
  readonly events: Array<{ eventType: string; payload: Record<string, unknown> }> = [];

  async publish(eventType: string, payload: Record<string, unknown>): Promise<void> {
    this.events.push({ eventType, payload });
  }
}

class MemoryGenerationRepository implements StudyGenerationRepository {
  saved?: StudyGeneration;

  async save(generation: StudyGeneration): Promise<StudyGeneration> {
    this.saved = generation;
    return generation;
  }
}

class MemoryCycleRepository implements StudyCycleRepository {
  readonly cycles = new Map<number, StudyCycle>();
  private nextId = 1;

  async findById(id: number): Promise<StudyCycle | null> {
    return this.cycles.get(id) ?? null;
  }

  async save(cycle: StudyCycle): Promise<StudyCycle> {
    const id = cycle.id ?? this.nextId++;
    const saved = cycle.id
      ? cycle
      : StudyCycle.create({
          id,
          generationId: cycle.generationId,
          sequence: cycle.sequence,
          period: cycle.period,
          status: cycle.status,
          githubIssueUrl: cycle.githubIssueUrl,
        });
    this.cycles.set(id, saved);
    return saved;
  }
}

class MemoryParticipantRepository implements GenerationParticipantRepository {
  readonly participants = new Map<number, GenerationParticipant>();

  async findById(id: number): Promise<GenerationParticipant | null> {
    return this.participants.get(id) ?? null;
  }

  async findByGenerationAndMember(
    generationId: number,
    memberId: number
  ): Promise<GenerationParticipant | null> {
    return (
      Array.from(this.participants.values()).find(
        (participant) =>
          participant.generationId === generationId && participant.memberId === memberId
      ) ?? null
    );
  }

  async save(participant: GenerationParticipant): Promise<GenerationParticipant> {
    this.participants.set(participant.id ?? 1, participant);
    return participant;
  }
}

describe('CreateStudyGenerationCommand', () => {
  it('creates a generation and publishes an outbox event', async () => {
    const generations = new MemoryGenerationRepository();
    const outbox = new MemoryOutbox();
    const command = new CreateStudyGenerationCommand(generations, outbox);

    const generation = await command.execute({
      studyId: 1,
      organizationId: 1,
      ordinal: 2,
      displayName: 'study-기수2기',
    });

    expect(generation.displayName).toBe('study-기수2기');
    expect(generation.plannedCycleCount).toBe(8);
    expect(outbox.events[0]?.eventType).toBe('GenerationCreated');
  });
});

describe('ScheduleStudyCycleCommand', () => {
  it('creates a scheduled cycle and publishes CycleScheduled', async () => {
    const cycles = new MemoryCycleRepository();
    const outbox = new MemoryOutbox();
    const command = new ScheduleStudyCycleCommand(cycles, outbox);

    const cycle = await command.execute({
      generationId: 1,
      sequence: 1,
      startAt: date('2026-01-01T00:00:00Z'),
      endAt: date('2026-01-15T00:00:00Z'),
    });

    expect(cycle.status).toBe('SCHEDULED');
    expect(outbox.events[0]?.eventType).toBe('CycleScheduled');
  });
});

describe('ApplyToGenerationCommand and ApproveGenerationParticipantCommand', () => {
  it('creates an applied participant and later approves it', async () => {
    const participants = new MemoryParticipantRepository();
    const outbox = new MemoryOutbox();

    const apply = new ApplyToGenerationCommand(participants, outbox);
    const applied = await apply.execute({ generationId: 1, memberId: 10 });

    expect(applied.status).toBe('APPLIED');
    expect(applied.roles).toContain('PARTICIPANT');

    const approve = new ApproveGenerationParticipantCommand(participants, outbox);
    const approved = await approve.execute({
      participantId: 1,
      approvedByMemberId: 99,
    });

    expect(approved.status).toBe('APPROVED');
    expect(outbox.events.map((event) => event.eventType)).toEqual([
      'GenerationParticipationApplied',
      'GenerationParticipationApproved',
    ]);
  });
});

describe('CheckRecordSubmissionEligibilityCommand', () => {
  it('returns eligibility and timing classification', async () => {
    const participants = new MemoryParticipantRepository();
    const cycles = new MemoryCycleRepository();

    const participant = GenerationParticipant.create({
      id: 1,
      generationId: 1,
      memberId: 1,
      status: 'APPROVED',
      roles: ['PARTICIPANT'],
    });
    const cycle = StudyCycle.create({
      id: 1,
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });
    cycle.schedule();
    cycle.open(date('2026-01-01T00:00:00Z'));

    participants.participants.set(1, participant);
    cycles.cycles.set(1, cycle);

    const command = new CheckRecordSubmissionEligibilityCommand(participants, cycles);
    const result = await command.execute({
      participantId: 1,
      cycleId: 1,
      submittedAt: date('2026-01-16T00:00:00Z'),
    });

    expect(result.canSubmit).toBe(true);
    expect(result.timingStatus).toBe('LATE_PENDING_APPROVAL');
  });
});

describe('HandleGithubManualChangeCommand', () => {
  it('closes a cycle for GitHub issue close and creates drift events for other changes', async () => {
    const cycles = new MemoryCycleRepository();
    const outbox = new MemoryOutbox();
    const cycle = StudyCycle.create({
      id: 1,
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });
    cycle.schedule();
    cycles.cycles.set(1, cycle);

    const command = new HandleGithubManualChangeCommand(cycles, outbox);
    await command.execute({
      cycleId: 1,
      changeType: 'ISSUE_CLOSED',
      remoteSnapshot: {},
    });
    await command.execute({
      cycleId: 1,
      changeType: 'ISSUE_TITLE_CHANGED',
      remoteSnapshot: { title: 'manual title' },
    });

    expect(cycles.cycles.get(1)?.status).toBe('CLOSED');
    expect(outbox.events.map((event) => event.eventType)).toEqual([
      'CycleClosed',
      'GithubDriftDetected',
    ]);
  });
});
