import { and, asc, eq } from 'drizzle-orm';
import {
  PeerReviewAssignment,
  PeerReviewCandidate,
} from '@/domain/peer-review';
import {
  PeerReviewAssignmentRepository,
  PeerReviewSubmissionLookupPort,
} from '@/application/peer-review';
import { db } from '../../lib/db';
import {
  members,
  peerReviewAssignments,
  submissions,
} from '../drizzle-db/schema';

type PeerReviewAssignmentRow = typeof peerReviewAssignments.$inferSelect;
type PeerReviewAssignmentInsert = typeof peerReviewAssignments.$inferInsert;

type PeerReviewAssignmentUpdate = Partial<
  Pick<
    PeerReviewAssignmentInsert,
    | 'status'
    | 'completedAt'
    | 'completedSourceUrl'
    | 'completionNote'
    | 'skippedAt'
    | 'skipReason'
    | 'cancelledAt'
    | 'updatedAt'
  >
>;

export function mapPeerReviewAssignmentRowToDomain(
  row: PeerReviewAssignmentRow
): PeerReviewAssignment {
  return PeerReviewAssignment.create({
    id: row.id,
    cycleId: row.cycleId,
    reviewerMemberId: row.reviewerMemberId,
    revieweeMemberId: row.revieweeMemberId,
    submissionId: row.submissionId,
    status: row.status,
    assignedAt: row.assignedAt,
    completedAt: row.completedAt ?? undefined,
    completedSourceUrl: row.completedSourceUrl ?? undefined,
    completionNote: row.completionNote ?? undefined,
    skippedAt: row.skippedAt ?? undefined,
    skipReason: row.skipReason ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
  });
}

export function mapPeerReviewAssignmentToInsert(
  assignment: PeerReviewAssignment
): PeerReviewAssignmentInsert {
  return {
    cycleId: assignment.cycleId,
    reviewerMemberId: assignment.reviewerMemberId,
    revieweeMemberId: assignment.revieweeMemberId,
    submissionId: assignment.submissionId,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    completedAt: assignment.completedAt,
    completedSourceUrl: assignment.completedSourceUrl,
    completionNote: assignment.completionNote,
    skippedAt: assignment.skippedAt,
    skipReason: assignment.skipReason,
    cancelledAt: assignment.cancelledAt,
  };
}

export function mapPeerReviewAssignmentToUpdate(
  assignment: PeerReviewAssignment
): PeerReviewAssignmentUpdate {
  return {
    status: assignment.status,
    completedAt: assignment.completedAt,
    completedSourceUrl: assignment.completedSourceUrl,
    completionNote: assignment.completionNote,
    skippedAt: assignment.skippedAt,
    skipReason: assignment.skipReason,
    cancelledAt: assignment.cancelledAt,
    updatedAt: new Date(),
  };
}

export class DrizzlePeerReviewAssignmentRepository implements PeerReviewAssignmentRepository {
  async findByCycleId(cycleId: number): Promise<PeerReviewAssignment[]> {
    const rows = await db
      .select()
      .from(peerReviewAssignments)
      .where(eq(peerReviewAssignments.cycleId, cycleId))
      .orderBy(asc(peerReviewAssignments.reviewerMemberId));

    return rows.map(mapPeerReviewAssignmentRowToDomain);
  }

  async findByCycleAndReviewer(
    cycleId: number,
    reviewerMemberId: number
  ): Promise<PeerReviewAssignment | null> {
    const [row] = await db
      .select()
      .from(peerReviewAssignments)
      .where(
        and(
          eq(peerReviewAssignments.cycleId, cycleId),
          eq(peerReviewAssignments.reviewerMemberId, reviewerMemberId)
        )
      )
      .limit(1);

    return row ? mapPeerReviewAssignmentRowToDomain(row) : null;
  }

  async saveMany(
    assignments: PeerReviewAssignment[]
  ): Promise<PeerReviewAssignment[]> {
    if (assignments.length === 0) return [];

    const rows = await db
      .insert(peerReviewAssignments)
      .values(assignments.map(mapPeerReviewAssignmentToInsert))
      .returning();

    return rows.map(mapPeerReviewAssignmentRowToDomain);
  }

  async save(assignment: PeerReviewAssignment): Promise<PeerReviewAssignment> {
    if (!assignment.id) {
      const [row] = await db
        .insert(peerReviewAssignments)
        .values(mapPeerReviewAssignmentToInsert(assignment))
        .returning();
      return mapPeerReviewAssignmentRowToDomain(row);
    }

    const [row] = await db
      .update(peerReviewAssignments)
      .set(mapPeerReviewAssignmentToUpdate(assignment))
      .where(eq(peerReviewAssignments.id, assignment.id))
      .returning();

    return mapPeerReviewAssignmentRowToDomain(row);
  }
}

export interface PeerReviewAssignmentDetailsRow {
  revieweeName: string;
  submissionUrl: string;
}

export function mapPeerReviewAssignmentDetailsRow(
  row: PeerReviewAssignmentDetailsRow
): PeerReviewAssignmentDetailsRow {
  return {
    revieweeName: row.revieweeName,
    submissionUrl: row.submissionUrl,
  };
}

export class DrizzlePeerReviewSubmissionLookup implements PeerReviewSubmissionLookupPort {
  async findAcceptedSubmissionCandidates(
    cycleId: number
  ): Promise<PeerReviewCandidate[]> {
    const rows = await db
      .select({
        memberId: submissions.memberId,
        submissionId: submissions.id,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.cycleId, cycleId),
          eq(submissions.status, 'ACCEPTED')
        )
      )
      .orderBy(asc(submissions.memberId), asc(submissions.submittedAt));

    return rows;
  }
}

export class DrizzlePeerReviewAssignmentDetailsLookup {
  async findAssignmentDetails(
    assignment: PeerReviewAssignment
  ): Promise<PeerReviewAssignmentDetailsRow> {
    const [row] = await db
      .select({
        revieweeName: members.name,
        submissionUrl: submissions.url,
      })
      .from(peerReviewAssignments)
      .innerJoin(
        submissions,
        eq(peerReviewAssignments.submissionId, submissions.id)
      )
      .innerJoin(
        members,
        eq(peerReviewAssignments.revieweeMemberId, members.id)
      )
      .where(eq(peerReviewAssignments.id, assignment.id ?? 0))
      .limit(1);

    if (!row) {
      return {
        revieweeName: `member#${assignment.revieweeMemberId}`,
        submissionUrl: '',
      };
    }

    return mapPeerReviewAssignmentDetailsRow(row);
  }
}
