import { describe, expect, it } from 'vitest';
import {
  CyclePeriod,
  GenerationParticipant,
  GithubDriftPolicy,
  ReminderPolicy,
  StudyCycle,
  StudyGeneration,
  StudyOperationsDomainError,
  SubmissionPolicy,
} from './study-operations.domain';

const date = (value: string) => new Date(value);

describe('StudyGeneration', () => {
  it('uses the agreed defaults for cycle count, duration, and inactivity threshold', () => {
    const generation = StudyGeneration.create({
      studyId: 1,
      organizationId: 1,
      ordinal: 1,
      displayName: 'study-기수1기',
    });

    expect(generation.plannedCycleCount).toBe(8);
    expect(generation.cycleDurationDays).toBe(14);
    expect(generation.inactiveThresholdMissedCycles).toBe(3);
    expect(generation.status).toBe('DRAFT');
  });

  it('freezes after completion', () => {
    const generation = StudyGeneration.create({
      studyId: 1,
      organizationId: 1,
      ordinal: 1,
      displayName: 'study-기수1기',
    });

    generation.plan();
    generation.activate();
    generation.complete();

    expect(generation.status).toBe('COMPLETED');
    expect(generation.isFrozen()).toBe(true);
    expect(() => generation.cancel()).toThrow(StudyOperationsDomainError);
  });
});

describe('StudyCycle', () => {
  it('does not allow period changes after scheduling', () => {
    const cycle = StudyCycle.create({
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });

    cycle.schedule();

    expect(() =>
      cycle.reschedule(
        CyclePeriod.create(date('2026-01-02T00:00:00Z'), date('2026-01-16T00:00:00Z'))
      )
    ).toThrow('Cycle period cannot be changed after scheduling');
  });

  it('maps GitHub issue close to a cycle close event', () => {
    const cycle = StudyCycle.create({
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });

    cycle.schedule();
    cycle.close('GITHUB_ISSUE_CLOSED');

    expect(cycle.status).toBe('CLOSED');
    expect(cycle.domainEvents.map((event) => event.type)).toContain('CycleClosedByGithubIssue');
  });
});

describe('GenerationParticipant and SubmissionPolicy', () => {
  it('requires approved participant role and open cycle for submission eligibility', () => {
    const participant = GenerationParticipant.create({
      generationId: 1,
      memberId: 1,
      status: 'APPROVED',
      roles: ['PARTICIPANT'],
    });
    const cycle = StudyCycle.create({
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });

    cycle.schedule();
    cycle.open(date('2026-01-01T00:00:00Z'));

    expect(SubmissionPolicy.canSubmit(participant, cycle)).toBe(true);
  });

  it('marks a participant inactive after three consecutive misses and only operator reactivates', () => {
    const participant = GenerationParticipant.create({
      generationId: 1,
      memberId: 1,
      status: 'APPROVED',
      roles: ['PARTICIPANT'],
    });

    participant.markMissedCycle();
    participant.markMissedCycle();
    expect(participant.status).toBe('APPROVED');

    participant.markMissedCycle();
    expect(participant.status).toBe('INACTIVE');
    expect(participant.domainEvents.map((event) => event.type)).toContain(
      'GenerationParticipantMarkedInactive'
    );

    participant.reactivateByOperator();
    expect(participant.status).toBe('APPROVED');
    expect(participant.consecutiveMissedCycles).toBe(0);
  });
});

describe('ReminderPolicy', () => {
  it('generates the fixed reminder offsets from cycle deadline', () => {
    const cycle = StudyCycle.create({
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });

    expect(ReminderPolicy.dueTimes(cycle).map((value) => value.toISOString())).toEqual([
      '2026-01-12T00:00:00.000Z',
      '2026-01-14T00:00:00.000Z',
      '2026-01-14T18:00:00.000Z',
      '2026-01-14T22:00:00.000Z',
    ]);
  });
});

describe('GithubDriftPolicy', () => {
  it('treats issue close as a domain signal and other manual changes as drift', () => {
    expect(GithubDriftPolicy.classify('ISSUE_CLOSED')).toEqual({ action: 'CLOSE_CYCLE' });
    expect(GithubDriftPolicy.classify('ISSUE_TITLE_CHANGED')).toEqual({
      action: 'DRIFT',
      reason: 'ISSUE_TITLE_CHANGED',
    });
  });
});
