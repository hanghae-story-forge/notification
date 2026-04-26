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
  ListGenerationApplicationsQuery,
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

  async findByGenerationAndStatus(
    generationId: number,
    status: GenerationParticipant['status']
  ): Promise<GenerationParticipant[]> {
    return Array.from(this.participants.values()).filter(
      (participant) =>
        participant.generationId === generationId && participant.status === status
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
  it('returns the existing participant when the same member already applied', async () => {
    const participants = new MemoryParticipantRepository();
    const outbox = new MemoryOutbox();
    const existing = GenerationParticipant.create({
      id: 7,
      generationId: 1,
      memberId: 10,
      status: 'APPLIED',
      roles: ['PARTICIPANT'],
    });
    participants.participants.set(7, existing);

    const apply = new ApplyToGenerationCommand(participants, outbox);
    const result = await apply.execute({ generationId: 1, memberId: 10 });

    expect(result).toBe(existing);
    expect(outbox.events).toEqual([]);
  });

  it('creates an applied participant and later approves it when approver is an operator', async () => {
    const participants = new MemoryParticipantRepository();
    const outbox = new MemoryOutbox();

    const apply = new ApplyToGenerationCommand(participants, outbox);
    const applied = await apply.execute({ generationId: 1, memberId: 10 });
    participants.participants.set(
      99,
      GenerationParticipant.create({
        id: 99,
        generationId: 1,
        memberId: 99,
        status: 'APPROVED',
        roles: ['MANAGER'],
      })
    );

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

  it('rejects approval when approver is not an owner or manager in the same generation', async () => {
    const participants = new MemoryParticipantRepository();
    const outbox = new MemoryOutbox();
    participants.participants.set(
      1,
      GenerationParticipant.create({
        id: 1,
        generationId: 1,
        memberId: 10,
        status: 'APPLIED',
        roles: ['PARTICIPANT'],
      })
    );
    participants.participants.set(
      2,
      GenerationParticipant.create({
        id: 2,
        generationId: 1,
        memberId: 99,
        status: 'APPROVED',
        roles: ['PARTICIPANT'],
      })
    );

    const approve = new ApproveGenerationParticipantCommand(participants, outbox);

    await expect(
      approve.execute({ participantId: 1, approvedByMemberId: 99 })
    ).rejects.toThrow('Approver must be an OWNER or MANAGER');
    expect(participants.participants.get(1)?.status).toBe('APPLIED');
    expect(outbox.events).toEqual([]);
  });

  it('rejects approval for a missing participant', async () => {
    const participants = new MemoryParticipantRepository();
    const outbox = new MemoryOutbox();
    const approve = new ApproveGenerationParticipantCommand(participants, outbox);

    await expect(
      approve.execute({ participantId: 404, approvedByMemberId: 99 })
    ).rejects.toThrow('Participant not found');
  });
});

describe('ListGenerationApplicationsQuery', () => {
  it('returns only applied participants for a generation when requester is an operator', async () => {
    const participants = new MemoryParticipantRepository();
    participants.participants.set(
      1,
      GenerationParticipant.create({
        id: 1,
        generationId: 1,
        memberId: 10,
        status: 'APPLIED',
        roles: ['PARTICIPANT'],
      })
    );
    participants.participants.set(
      2,
      GenerationParticipant.create({
        id: 2,
        generationId: 1,
        memberId: 11,
        status: 'APPROVED',
        roles: ['PARTICIPANT'],
      })
    );
    participants.participants.set(
      3,
      GenerationParticipant.create({
        id: 3,
        generationId: 2,
        memberId: 12,
        status: 'APPLIED',
        roles: ['PARTICIPANT'],
      })
    );

    participants.participants.set(
      99,
      GenerationParticipant.create({
        id: 99,
        generationId: 1,
        memberId: 99,
        status: 'APPROVED',
        roles: ['OWNER'],
      })
    );

    const query = new ListGenerationApplicationsQuery(participants);
    const result = await query.execute({ generationId: 1, requesterMemberId: 99 });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
    expect(result[0]?.memberId).toBe(10);
    expect(result[0]?.status).toBe('APPLIED');
  });

  it('rejects listing applications when requester is not an owner or manager', async () => {
    const participants = new MemoryParticipantRepository();
    participants.participants.set(
      1,
      GenerationParticipant.create({
        id: 1,
        generationId: 1,
        memberId: 10,
        status: 'APPLIED',
        roles: ['PARTICIPANT'],
      })
    );
    participants.participants.set(
      2,
      GenerationParticipant.create({
        id: 2,
        generationId: 1,
        memberId: 99,
        status: 'APPROVED',
        roles: ['PARTICIPANT'],
      })
    );

    const query = new ListGenerationApplicationsQuery(participants);

    await expect(
      query.execute({ generationId: 1, requesterMemberId: 99 })
    ).rejects.toThrow('Requester must be an OWNER or MANAGER');
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

  it('rejects eligibility check when participant is missing', async () => {
    const participants = new MemoryParticipantRepository();
    const cycles = new MemoryCycleRepository();
    const command = new CheckRecordSubmissionEligibilityCommand(participants, cycles);

    await expect(
      command.execute({
        participantId: 404,
        cycleId: 1,
        submittedAt: date('2026-01-16T00:00:00Z'),
      })
    ).rejects.toThrow('Participant not found');
  });

  it('rejects eligibility check when cycle is missing', async () => {
    const participants = new MemoryParticipantRepository();
    const cycles = new MemoryCycleRepository();
    participants.participants.set(
      1,
      GenerationParticipant.create({
        id: 1,
        generationId: 1,
        memberId: 1,
        status: 'APPROVED',
        roles: ['PARTICIPANT'],
      })
    );
    const command = new CheckRecordSubmissionEligibilityCommand(participants, cycles);

    await expect(
      command.execute({
        participantId: 1,
        cycleId: 404,
        submittedAt: date('2026-01-16T00:00:00Z'),
      })
    ).rejects.toThrow('Cycle not found');
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

  it('rejects GitHub issue close when cycle is missing', async () => {
    const cycles = new MemoryCycleRepository();
    const outbox = new MemoryOutbox();
    const command = new HandleGithubManualChangeCommand(cycles, outbox);

    await expect(
      command.execute({
        cycleId: 404,
        changeType: 'ISSUE_CLOSED',
        remoteSnapshot: {},
      })
    ).rejects.toThrow('Cycle not found');
    expect(outbox.events).toEqual([]);
  });
});
