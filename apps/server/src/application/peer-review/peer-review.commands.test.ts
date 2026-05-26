import { describe, expect, it } from 'vitest';
import { PeerReviewAssignment } from '@/domain/peer-review';
import {
  CompletePeerReviewAssignmentCommand,
  CreatePeerReviewAssignmentsCommand,
  GetMyPeerReviewAssignmentQuery,
  GetPeerReviewStatusQuery,
  PeerReviewApplicationError,
  PeerReviewAssignmentRepository,
  PeerReviewSubmissionLookupPort,
} from './peer-review.commands';

class FakeSubmissionLookup implements PeerReviewSubmissionLookupPort {
  constructor(
    private readonly candidates: Awaited<
      ReturnType<
        PeerReviewSubmissionLookupPort['findAcceptedSubmissionCandidates']
      >
    >
  ) {}

  async findAcceptedSubmissionCandidates() {
    return this.candidates;
  }
}

class FakeAssignmentRepository implements PeerReviewAssignmentRepository {
  assignments: PeerReviewAssignment[];

  constructor(assignments: PeerReviewAssignment[] = []) {
    this.assignments = assignments;
  }

  async findByCycleId(cycleId: number) {
    return this.assignments.filter(
      (assignment) => assignment.cycleId === cycleId
    );
  }

  async findByCycleAndReviewer(cycleId: number, reviewerMemberId: number) {
    return (
      this.assignments.find(
        (assignment) =>
          assignment.cycleId === cycleId &&
          assignment.reviewerMemberId === reviewerMemberId
      ) ?? null
    );
  }

  async saveMany(assignments: PeerReviewAssignment[]) {
    this.assignments.push(...assignments);
    return assignments;
  }

  async save(assignment: PeerReviewAssignment) {
    const index = this.assignments.findIndex(
      (item) =>
        item.cycleId === assignment.cycleId &&
        item.reviewerMemberId === assignment.reviewerMemberId
    );
    if (index >= 0) {
      this.assignments[index] = assignment;
    } else {
      this.assignments.push(assignment);
    }
    return assignment;
  }
}

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

describe('CreatePeerReviewAssignmentsCommand', () => {
  it('creates assignments from accepted submission candidates', async () => {
    const repository = new FakeAssignmentRepository();
    const command = new CreatePeerReviewAssignmentsCommand(
      new FakeSubmissionLookup(candidates),
      repository
    );

    const result = await command.execute({ cycleId: 1, seed: 'cycle-1' });

    expect(result).toHaveLength(3);
    expect(repository.assignments).toHaveLength(3);
    expect(
      new Set(result.map((assignment) => assignment.reviewerMemberId))
    ).toEqual(new Set([10, 20, 30]));
  });

  it('refuses to create duplicate assignments for a cycle', async () => {
    const repository = new FakeAssignmentRepository([
      PeerReviewAssignment.create({
        cycleId: 1,
        reviewerMemberId: 10,
        revieweeMemberId: 20,
        submissionId: 200,
      }),
    ]);
    const command = new CreatePeerReviewAssignmentsCommand(
      new FakeSubmissionLookup(candidates),
      repository
    );

    await expect(
      command.execute({ cycleId: 1, seed: 'cycle-1' })
    ).rejects.toThrow(PeerReviewApplicationError);
  });
});

describe('GetMyPeerReviewAssignmentQuery', () => {
  it('returns the requester assignment for the cycle', async () => {
    const assignment = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });
    const query = new GetMyPeerReviewAssignmentQuery(
      new FakeAssignmentRepository([assignment])
    );

    await expect(
      query.execute({ cycleId: 1, reviewerMemberId: 10 })
    ).resolves.toBe(assignment);
  });

  it('returns null when the requester has no assignment', async () => {
    const query = new GetMyPeerReviewAssignmentQuery(
      new FakeAssignmentRepository()
    );

    await expect(
      query.execute({ cycleId: 1, reviewerMemberId: 10 })
    ).resolves.toBeNull();
  });
});

describe('GetPeerReviewStatusQuery', () => {
  it('summarizes assignments by status', async () => {
    const completed = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });
    completed.complete({ completedAt: new Date('2026-05-27T00:00:00.000Z') });
    const pending = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 20,
      revieweeMemberId: 10,
      submissionId: 100,
    });
    const skipped = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 30,
      revieweeMemberId: 10,
      submissionId: 100,
    });
    skipped.skip({ skippedAt: new Date('2026-05-27T00:00:00.000Z') });

    const query = new GetPeerReviewStatusQuery(
      new FakeAssignmentRepository([completed, pending, skipped])
    );

    await expect(query.execute({ cycleId: 1 })).resolves.toEqual({
      cycleId: 1,
      total: 3,
      completed: 1,
      pending: 1,
      skipped: 1,
      cancelled: 0,
      pendingReviewerMemberIds: [20],
    });
  });
});

describe('CompletePeerReviewAssignmentCommand', () => {
  it('marks the requester assignment as completed', async () => {
    const assignment = PeerReviewAssignment.create({
      cycleId: 1,
      reviewerMemberId: 10,
      revieweeMemberId: 20,
      submissionId: 200,
    });
    const repository = new FakeAssignmentRepository([assignment]);
    const command = new CompletePeerReviewAssignmentCommand(repository);

    const result = await command.execute({
      cycleId: 1,
      reviewerMemberId: 10,
      completedAt: new Date('2026-05-27T00:00:00.000Z'),
      completedSourceUrl: 'https://discord.com/channels/1/2/3',
      completionNote: '남겼음',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.completedSourceUrl).toBe(
      'https://discord.com/channels/1/2/3'
    );
    expect(result.completionNote).toBe('남겼음');
  });

  it('fails with a helpful error when the requester has no assignment', async () => {
    const command = new CompletePeerReviewAssignmentCommand(
      new FakeAssignmentRepository()
    );

    await expect(
      command.execute({ cycleId: 1, reviewerMemberId: 10 })
    ).rejects.toThrow(PeerReviewApplicationError);
  });
});
