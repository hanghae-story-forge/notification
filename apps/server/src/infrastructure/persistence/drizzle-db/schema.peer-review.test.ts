import { describe, expect, it } from 'vitest';
import {
  cycleReviewSettings,
  peerReviewAssignments,
  peerReviewAssignmentStatusEnum,
} from './schema';

describe('peer review drizzle schema', () => {
  it('defines peer review assignment statuses', () => {
    expect(peerReviewAssignmentStatusEnum.enumValues).toEqual([
      'ASSIGNED',
      'COMPLETED',
      'SKIPPED',
      'CANCELLED',
    ]);
  });

  it('defines cycle review settings columns', () => {
    expect(cycleReviewSettings.cycleId.name).toBe('cycle_id');
    expect(cycleReviewSettings.enabled.name).toBe('enabled');
    expect(cycleReviewSettings.assignmentSeed.name).toBe('assignment_seed');
    expect(cycleReviewSettings.minSubmissionCount.name).toBe(
      'min_submission_count'
    );
  });

  it('defines peer review assignment columns', () => {
    expect(peerReviewAssignments.cycleId.name).toBe('cycle_id');
    expect(peerReviewAssignments.reviewerMemberId.name).toBe(
      'reviewer_member_id'
    );
    expect(peerReviewAssignments.revieweeMemberId.name).toBe(
      'reviewee_member_id'
    );
    expect(peerReviewAssignments.submissionId.name).toBe('submission_id');
    expect(peerReviewAssignments.completedSourceUrl.name).toBe(
      'completed_source_url'
    );
    expect(peerReviewAssignments.completionNote.name).toBe('completion_note');
  });
});
