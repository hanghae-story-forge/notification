import { describe, expect, it } from 'vitest';
import {
  mapPeerReviewAssignmentDetailsRow,
  mapPeerReviewAssignmentRowToDomain,
  mapPeerReviewAssignmentToInsert,
  mapPeerReviewAssignmentToUpdate,
} from './peer-review.repository.impl';

describe('peer review persistence mappers', () => {
  it('maps a database row into a domain assignment', () => {
    const assignedAt = new Date('2026-05-26T00:00:00.000Z');
    const completedAt = new Date('2026-05-27T00:00:00.000Z');

    const assignment = mapPeerReviewAssignmentRowToDomain({
      id: 1,
      cycleId: 10,
      reviewerMemberId: 20,
      revieweeMemberId: 30,
      submissionId: 300,
      status: 'COMPLETED',
      assignedAt,
      completedAt,
      completedSourceUrl: 'https://github.com/org/repo/issues/1#comment-1',
      completionNote: '좋았던 점 남김',
      skippedAt: null,
      skipReason: null,
      cancelledAt: null,
      createdAt: assignedAt,
      updatedAt: completedAt,
    });

    expect(assignment.id).toBe(1);
    expect(assignment.cycleId).toBe(10);
    expect(assignment.reviewerMemberId).toBe(20);
    expect(assignment.revieweeMemberId).toBe(30);
    expect(assignment.submissionId).toBe(300);
    expect(assignment.status).toBe('COMPLETED');
    expect(assignment.assignedAt).toBe(assignedAt);
    expect(assignment.completedAt).toBe(completedAt);
    expect(assignment.completedSourceUrl).toBe(
      'https://github.com/org/repo/issues/1#comment-1'
    );
    expect(assignment.completionNote).toBe('좋았던 점 남김');
  });

  it('maps a new domain assignment into insert values', () => {
    const assignedAt = new Date('2026-05-26T00:00:00.000Z');
    const assignment = mapPeerReviewAssignmentRowToDomain({
      id: 1,
      cycleId: 10,
      reviewerMemberId: 20,
      revieweeMemberId: 30,
      submissionId: 300,
      status: 'ASSIGNED',
      assignedAt,
      completedAt: null,
      completedSourceUrl: null,
      completionNote: null,
      skippedAt: null,
      skipReason: null,
      cancelledAt: null,
      createdAt: assignedAt,
      updatedAt: assignedAt,
    });

    expect(mapPeerReviewAssignmentToInsert(assignment)).toEqual({
      cycleId: 10,
      reviewerMemberId: 20,
      revieweeMemberId: 30,
      submissionId: 300,
      status: 'ASSIGNED',
      assignedAt,
      completedAt: undefined,
      completedSourceUrl: undefined,
      completionNote: undefined,
      skippedAt: undefined,
      skipReason: undefined,
      cancelledAt: undefined,
    });
  });

  it('maps a completed assignment into update values', () => {
    const assignedAt = new Date('2026-05-26T00:00:00.000Z');
    const completedAt = new Date('2026-05-27T00:00:00.000Z');
    const assignment = mapPeerReviewAssignmentRowToDomain({
      id: 1,
      cycleId: 10,
      reviewerMemberId: 20,
      revieweeMemberId: 30,
      submissionId: 300,
      status: 'ASSIGNED',
      assignedAt,
      completedAt: null,
      completedSourceUrl: null,
      completionNote: null,
      skippedAt: null,
      skipReason: null,
      cancelledAt: null,
      createdAt: assignedAt,
      updatedAt: assignedAt,
    });

    assignment.complete({
      completedAt,
      completedSourceUrl: 'https://example.com/comment',
      completionNote: '완료',
    });

    expect(mapPeerReviewAssignmentToUpdate(assignment)).toMatchObject({
      status: 'COMPLETED',
      completedAt,
      completedSourceUrl: 'https://example.com/comment',
      completionNote: '완료',
      skippedAt: undefined,
      skipReason: undefined,
      cancelledAt: undefined,
    });
    expect(
      mapPeerReviewAssignmentToUpdate(assignment).updatedAt
    ).toBeInstanceOf(Date);
  });

  it('maps assignment detail rows into reviewee display data', () => {
    expect(
      mapPeerReviewAssignmentDetailsRow({
        revieweeName: '김리뷰',
        submissionUrl: 'https://example.com/post',
      })
    ).toEqual({
      revieweeName: '김리뷰',
      submissionUrl: 'https://example.com/post',
    });
  });
});
