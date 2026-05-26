import {
  PeerReviewAssignment,
  PeerReviewCandidate,
  generatePeerReviewAssignments,
} from '@/domain/peer-review';

export class PeerReviewApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PeerReviewApplicationError';
  }
}

export interface PeerReviewSubmissionLookupPort {
  findAcceptedSubmissionCandidates(
    cycleId: number
  ): Promise<PeerReviewCandidate[]>;
}

export interface PeerReviewAssignmentRepository {
  findByCycleId(cycleId: number): Promise<PeerReviewAssignment[]>;
  findByCycleAndReviewer(
    cycleId: number,
    reviewerMemberId: number
  ): Promise<PeerReviewAssignment | null>;
  saveMany(
    assignments: PeerReviewAssignment[]
  ): Promise<PeerReviewAssignment[]>;
  save(assignment: PeerReviewAssignment): Promise<PeerReviewAssignment>;
}

export interface CreatePeerReviewAssignmentsRequest {
  cycleId: number;
  seed: string;
}

export class CreatePeerReviewAssignmentsCommand {
  constructor(
    private readonly submissionLookup: PeerReviewSubmissionLookupPort,
    private readonly assignmentRepository: PeerReviewAssignmentRepository
  ) {}

  async execute(
    request: CreatePeerReviewAssignmentsRequest
  ): Promise<PeerReviewAssignment[]> {
    const existing = await this.assignmentRepository.findByCycleId(
      request.cycleId
    );
    if (existing.length > 0) {
      throw new PeerReviewApplicationError(
        'Peer review assignments already exist for this cycle'
      );
    }

    const candidates =
      await this.submissionLookup.findAcceptedSubmissionCandidates(
        request.cycleId
      );
    const assignments = generatePeerReviewAssignments({
      cycleId: request.cycleId,
      seed: request.seed,
      candidates,
    });

    return this.assignmentRepository.saveMany(assignments);
  }
}

export interface GetMyPeerReviewAssignmentRequest {
  cycleId: number;
  reviewerMemberId: number;
}

export class GetMyPeerReviewAssignmentQuery {
  constructor(
    private readonly assignmentRepository: PeerReviewAssignmentRepository
  ) {}

  async execute(
    request: GetMyPeerReviewAssignmentRequest
  ): Promise<PeerReviewAssignment | null> {
    return this.assignmentRepository.findByCycleAndReviewer(
      request.cycleId,
      request.reviewerMemberId
    );
  }
}

export interface PeerReviewStatusResult {
  cycleId: number;
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  cancelled: number;
  pendingReviewerMemberIds: number[];
}

export class GetPeerReviewStatusQuery {
  constructor(
    private readonly assignmentRepository: PeerReviewAssignmentRepository
  ) {}

  async execute(request: { cycleId: number }): Promise<PeerReviewStatusResult> {
    const assignments = await this.assignmentRepository.findByCycleId(
      request.cycleId
    );

    return {
      cycleId: request.cycleId,
      total: assignments.length,
      completed: assignments.filter(
        (assignment) => assignment.status === 'COMPLETED'
      ).length,
      pending: assignments.filter(
        (assignment) => assignment.status === 'ASSIGNED'
      ).length,
      skipped: assignments.filter(
        (assignment) => assignment.status === 'SKIPPED'
      ).length,
      cancelled: assignments.filter(
        (assignment) => assignment.status === 'CANCELLED'
      ).length,
      pendingReviewerMemberIds: assignments
        .filter((assignment) => assignment.status === 'ASSIGNED')
        .map((assignment) => assignment.reviewerMemberId),
    };
  }
}

export interface CompletePeerReviewAssignmentRequest {
  cycleId: number;
  reviewerMemberId: number;
  completedAt?: Date;
  completedSourceUrl?: string;
  completionNote?: string;
}

export class CompletePeerReviewAssignmentCommand {
  constructor(
    private readonly assignmentRepository: PeerReviewAssignmentRepository
  ) {}

  async execute(
    request: CompletePeerReviewAssignmentRequest
  ): Promise<PeerReviewAssignment> {
    const assignment = await this.assignmentRepository.findByCycleAndReviewer(
      request.cycleId,
      request.reviewerMemberId
    );
    if (!assignment) {
      throw new PeerReviewApplicationError(
        'Peer review assignment not found for this reviewer and cycle'
      );
    }

    assignment.complete({
      completedAt: request.completedAt,
      completedSourceUrl: request.completedSourceUrl,
      completionNote: request.completionNote,
    });

    return this.assignmentRepository.save(assignment);
  }
}
