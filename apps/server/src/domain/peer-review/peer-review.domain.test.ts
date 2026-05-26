import { describe, expect, it } from 'vitest';
import {
  PeerReviewAssignment,
  PeerReviewDomainError,
  generatePeerReviewAssignments,
} from './peer-review.domain';

describe('PeerReviewAssignment', () => {
  it('rejects assigning a member to review their own submission', () => {
    expect(() =>
      PeerReviewAssignment.create({
        cycleId: 1,
        reviewerMemberId: 10,
        revieweeMemberId: 10,
        submissionId: 100,
      })
    ).toThrow(PeerReviewDomainError);
  });

  it('marks an assigned review as completed with optional evidence', () => {
    const assignment = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
      assignedAt: new Date('2026-05-26T00:00:00.000Z'),
    });

    assignment.complete({
      completedAt: new Date('2026-05-27T00:00:00.000Z'),
      completedSourceUrl: 'https://discord.com/channels/1/2/3',
      completionNote: '댓글 남김',
    });

    expect(assignment.status).toBe('COMPLETED');
    expect(assignment.completedAt?.toISOString()).toBe(
      '2026-05-27T00:00:00.000Z'
    );
    expect(assignment.completedSourceUrl).toBe(
      'https://discord.com/channels/1/2/3'
    );
    expect(assignment.completionNote).toBe('댓글 남김');
  });

  it('does not allow completing a skipped review', () => {
    const assignment = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });

    assignment.skip({
      skippedAt: new Date('2026-05-27T00:00:00.000Z'),
      skipReason: '작성자가 제출을 철회함',
    });

    expect(assignment.skippedAt?.toISOString()).toBe(
      '2026-05-27T00:00:00.000Z'
    );
    expect(assignment.skipReason).toBe('작성자가 제출을 철회함');
    expect(() => assignment.complete()).toThrow(PeerReviewDomainError);
  });

  it('rejects invalid identifiers', () => {
    const valid = {
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    };

    expect(() => PeerReviewAssignment.create({ ...valid, cycleId: 0 })).toThrow(
      PeerReviewDomainError
    );
    expect(() =>
      PeerReviewAssignment.create({ ...valid, reviewerMemberId: 0 })
    ).toThrow(PeerReviewDomainError);
    expect(() =>
      PeerReviewAssignment.create({ ...valid, revieweeMemberId: 0 })
    ).toThrow(PeerReviewDomainError);
    expect(() =>
      PeerReviewAssignment.create({ ...valid, submissionId: 0 })
    ).toThrow(PeerReviewDomainError);
  });

  it('cancels an assigned review and rejects cancelling a completed review', () => {
    const assigned = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });

    assigned.cancel(new Date('2026-05-28T00:00:00.000Z'));

    expect(assigned.status).toBe('CANCELLED');
    expect(assigned.cancelledAt?.toISOString()).toBe(
      '2026-05-28T00:00:00.000Z'
    );

    const completed = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 20,
      revieweeMemberId: 10,
      submissionId: 100,
    });
    completed.complete();

    expect(() => completed.cancel()).toThrow(PeerReviewDomainError);
  });

  it('does not allow skipping a completed review', () => {
    const assignment = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });
    assignment.complete();

    expect(() => assignment.skip()).toThrow(PeerReviewDomainError);
  });

  it('can skip an assigned review without explicit timestamp', () => {
    const assignment = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });

    assignment.skip();

    expect(assignment.status).toBe('SKIPPED');
    expect(assignment.skippedAt).toBeInstanceOf(Date);
  });
});

describe('generatePeerReviewAssignments', () => {
  it('requires at least two distinct submitters', () => {
    expect(() =>
      generatePeerReviewAssignments({
        cycleId: 1,
        seed: 'cycle-1',
        candidates: [
          {
            memberId: 10,
            submissionId: 100,
            submittedAt: new Date('2026-05-26T00:00:00.000Z'),
          },
        ],
      })
    ).toThrow(PeerReviewDomainError);
  });

  it('creates one outgoing and one incoming assignment per submitter without self-review', () => {
    const assignments = generatePeerReviewAssignments({
      cycleId: 1,
      seed: 'cycle-1',
      candidates: [
        {
          memberId: 10,
          submissionId: 100,
          submittedAt: new Date('2026-05-26T00:00:00.000Z'),
        },
        {
          memberId: 20,
          submissionId: 200,
          submittedAt: new Date('2026-05-26T01:00:00.000Z'),
        },
        {
          memberId: 30,
          submissionId: 300,
          submittedAt: new Date('2026-05-26T02:00:00.000Z'),
        },
        {
          memberId: 40,
          submissionId: 400,
          submittedAt: new Date('2026-05-26T03:00:00.000Z'),
        },
      ],
    });

    expect(assignments).toHaveLength(4);
    expect(new Set(assignments.map((a) => a.reviewerMemberId))).toEqual(
      new Set([10, 20, 30, 40])
    );
    expect(new Set(assignments.map((a) => a.revieweeMemberId))).toEqual(
      new Set([10, 20, 30, 40])
    );
    expect(
      assignments.every((a) => a.reviewerMemberId !== a.revieweeMemberId)
    ).toBe(true);
  });

  it('is stable for the same seed and candidates regardless of input order', () => {
    const candidates = [
      {
        memberId: 10,
        submissionId: 100,
        submittedAt: new Date('2026-05-26T00:00:00.000Z'),
      },
      {
        memberId: 20,
        submissionId: 200,
        submittedAt: new Date('2026-05-26T01:00:00.000Z'),
      },
      {
        memberId: 30,
        submissionId: 300,
        submittedAt: new Date('2026-05-26T02:00:00.000Z'),
      },
    ];

    const first = generatePeerReviewAssignments({
      cycleId: 1,
      seed: 'cycle-1',
      candidates,
    }).map((a) => [a.reviewerMemberId, a.revieweeMemberId, a.submissionId]);

    const second = generatePeerReviewAssignments({
      cycleId: 1,
      seed: 'cycle-1',
      candidates: [...candidates].reverse(),
    }).map((a) => [a.reviewerMemberId, a.revieweeMemberId, a.submissionId]);

    expect(second).toEqual(first);
  });

  it('uses the earliest submission when a member submitted multiple posts', () => {
    const assignments = generatePeerReviewAssignments({
      cycleId: 1,
      seed: 'cycle-1',
      candidates: [
        {
          memberId: 10,
          submissionId: 101,
          submittedAt: new Date('2026-05-26T02:00:00.000Z'),
        },
        {
          memberId: 10,
          submissionId: 100,
          submittedAt: new Date('2026-05-26T00:00:00.000Z'),
        },
        {
          memberId: 20,
          submissionId: 200,
          submittedAt: new Date('2026-05-26T01:00:00.000Z'),
        },
      ],
    });

    expect(assignments.map((a) => a.submissionId).sort()).toEqual([100, 200]);
  });

  it('keeps the existing earliest submission when a later duplicate appears', () => {
    const assignments = generatePeerReviewAssignments({
      cycleId: 1,
      seed: 'cycle-1',
      candidates: [
        {
          memberId: 10,
          submissionId: 100,
          submittedAt: new Date('2026-05-26T00:00:00.000Z'),
        },
        {
          memberId: 10,
          submissionId: 101,
          submittedAt: new Date('2026-05-26T02:00:00.000Z'),
        },
        {
          memberId: 20,
          submissionId: 200,
          submittedAt: new Date('2026-05-26T01:00:00.000Z'),
        },
      ],
    });

    expect(assignments.map((a) => a.submissionId).sort()).toEqual([100, 200]);
  });
});
