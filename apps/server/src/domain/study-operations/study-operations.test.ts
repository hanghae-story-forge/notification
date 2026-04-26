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
  it('rejects invalid generation identity values', () => {
    expect(() =>
      StudyGeneration.create({
        studyId: 1,
        organizationId: 1,
        ordinal: 0,
        displayName: 'study-기수0기',
      })
    ).toThrow('Generation ordinal must be positive');

    expect(() =>
      StudyGeneration.create({
        studyId: 1,
        organizationId: 1,
        ordinal: 1,
        displayName: '   ',
      })
    ).toThrow('Generation displayName cannot be empty');
  });

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
    expect(generation.domainEvents.map((event) => event.type)).toEqual([
      'GenerationCreated',
    ]);
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

  it('enforces generation state transitions and mutability checks', () => {
    const draft = StudyGeneration.create({
      studyId: 1,
      organizationId: 1,
      ordinal: 1,
      displayName: 'study-기수1기',
    });
    expect(() => draft.activate()).toThrow('Only PLANNED generation can be activated');
    expect(() => draft.complete()).toThrow(
      'Only PLANNED or ACTIVE generation can be completed'
    );
    draft.assertMutable();
    draft.cancel();
    expect(draft.status).toBe('CANCELLED');
    expect(() => draft.assertMutable()).toThrow('Frozen generation cannot be modified');

    const planned = StudyGeneration.create({
      studyId: 1,
      organizationId: 1,
      ordinal: 2,
      displayName: 'study-기수2기',
    });
    planned.plan();
    expect(() => planned.plan()).toThrow('Only DRAFT generation can be planned');
    planned.complete();
    expect(planned.status).toBe('COMPLETED');
  });
});

describe('CyclePeriod', () => {
  it('requires startAt before endAt and exposes duration/containment helpers', () => {
    expect(() =>
      CyclePeriod.create(date('2026-01-15T00:00:00Z'), date('2026-01-15T00:00:00Z'))
    ).toThrow('Cycle startAt must be before endAt');

    const period = CyclePeriod.create(
      date('2026-01-01T00:00:00Z'),
      date('2026-01-15T00:00:00Z')
    );

    expect(period.durationDays()).toBe(14);
    expect(period.contains(date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(period.contains(date('2026-01-15T00:00:00Z'))).toBe(true);
    expect(period.contains(date('2026-01-16T00:00:00Z'))).toBe(false);
  });
});

describe('StudyCycle', () => {
  it('rejects invalid cycle sequence values', () => {
    expect(() =>
      StudyCycle.create({
        generationId: 1,
        sequence: 0,
        period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
      })
    ).toThrow('Cycle sequence must be positive');
  });

  it('allows period changes while still in draft', () => {
    const cycle = StudyCycle.create({
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });
    const newPeriod = CyclePeriod.create(
      date('2026-01-02T00:00:00Z'),
      date('2026-01-16T00:00:00Z')
    );

    cycle.reschedule(newPeriod);

    expect(cycle.period).toBe(newPeriod);
    expect(cycle.domainEvents.map((event) => event.type)).toContain('CycleRescheduled');
  });

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

  it('enforces status transitions for schedule, open, close, and complete', () => {
    const cycle = StudyCycle.create({
      generationId: 1,
      sequence: 1,
      period: CyclePeriod.create(date('2026-01-01T00:00:00Z'), date('2026-01-15T00:00:00Z')),
    });

    expect(() => cycle.open(date('2026-01-01T00:00:00Z'))).toThrow(
      'Only SCHEDULED cycle can be opened'
    );
    expect(() => cycle.close()).toThrow('Only SCHEDULED or OPEN cycle can be closed');
    expect(() => cycle.complete()).toThrow('Only CLOSED cycle can be completed');

    cycle.schedule();
    expect(() => cycle.schedule()).toThrow('Only DRAFT cycle can be scheduled');
    expect(() => cycle.open(date('2025-12-31T23:59:59Z'))).toThrow(
      'Cycle cannot be opened before startAt'
    );

    cycle.open(date('2026-01-01T00:00:00Z'));
    cycle.close('OPERATOR');
    cycle.complete();

    expect(cycle.status).toBe('COMPLETED');
    expect(cycle.domainEvents.map((event) => event.type)).toEqual([
      'CycleCreated',
      'CycleScheduled',
      'CycleOpened',
      'CycleClosed',
      'CycleCompleted',
    ]);
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
  it('assigns roles and rejects invalid approval/reactivation/removal transitions', () => {
    const participant = GenerationParticipant.create({
      generationId: 1,
      memberId: 1,
    });

    participant.assignRole('OBSERVER');

    expect(participant.roles).toEqual(['OBSERVER']);
    expect(participant.hasRole('OBSERVER')).toBe(true);
    expect(participant.consecutiveMissedCycles).toBe(0);
    expect(participant.domainEvents.map((event) => event.type)).toEqual([
      'GenerationParticipantRoleAssigned',
    ]);
    expect(() => participant.reactivateByOperator()).toThrow(
      'Only INACTIVE participant can be reactivated'
    );
    expect(() => participant.removeByOperator()).toThrow(
      'Only APPROVED or INACTIVE participant can be removed'
    );

    participant.approve();
    expect(() => participant.approve()).toThrow(
      'Only APPLIED participant can be approved'
    );
  });

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
    expect(SubmissionPolicy.classifyTiming(date('2026-01-15T00:00:00Z'), cycle)).toBe(
      'ON_TIME'
    );
  });

  it('resets missed count on submission and removes approved or inactive participants', () => {
    const approved = GenerationParticipant.create({
      generationId: 1,
      memberId: 1,
      status: 'APPROVED',
      roles: ['PARTICIPANT'],
      consecutiveMissedCycles: 2,
    });
    const inactive = GenerationParticipant.create({
      generationId: 1,
      memberId: 2,
      status: 'INACTIVE',
      roles: ['PARTICIPANT'],
    });

    approved.recordSubmission();
    approved.removeByOperator();
    inactive.removeByOperator();

    expect(approved.consecutiveMissedCycles).toBe(0);
    expect(approved.status).toBe('REMOVED');
    expect(inactive.status).toBe('REMOVED');
    expect(approved.domainEvents.map((event) => event.type)).toContain(
      'GenerationParticipantRemoved'
    );
  });

  it('ignores missed cycles unless the participant is approved', () => {
    const participant = GenerationParticipant.create({
      generationId: 1,
      memberId: 1,
      status: 'APPLIED',
      roles: ['PARTICIPANT'],
    });

    participant.markMissedCycle();

    expect(participant.status).toBe('APPLIED');
    expect(participant.consecutiveMissedCycles).toBe(0);
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
