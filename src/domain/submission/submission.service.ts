// Submission Domain Service - 제출 도메인 서비스

import { MemberId, CycleId } from './submission.domain';
import { SubmissionRepository } from './submission.repository';
import { ConflictError } from '../common/errors';

/**
 * 제출 도메인 서비스
 * 여러 애그리거트에 걸친 비즈니스 로직을 처리
 */
export class SubmissionService {
  constructor(private readonly submissionRepo: SubmissionRepository) {}

  /**
   * 제출 가능 여부 확인
   * - 이미 제출된 회원인지 확인
   * - 중복 GitHub Comment ID인지 확인
   */
  async canSubmit(
    cycleId: CycleId,
    memberId: MemberId,
    githubCommentId: string
  ): Promise<{ canSubmit: boolean; reason?: string }> {
    // 이미 제출되었는지 확인
    const existing = await this.submissionRepo.findByCycleAndMember(
      cycleId,
      memberId
    );
    if (existing) {
      return {
        canSubmit: false,
        reason: 'Already submitted for this cycle',
      };
    }

    // GitHub Comment ID 중복 확인
    const byCommentId = await this.submissionRepo.findByGithubCommentId(
      githubCommentId
    );
    if (byCommentId) {
      return {
        canSubmit: false,
        reason: 'GitHub comment ID already used',
      };
    }

    return { canSubmit: true };
  }

  /**
   * 제출 가능 여부를 검증하고, 불가능하면 에러를 던짐
   */
  async validateSubmission(
    cycleId: CycleId,
    memberId: MemberId,
    githubCommentId: string
  ): Promise<void> {
    const result = await this.canSubmit(
      cycleId,
      memberId,
      githubCommentId
    );

    if (!result.canSubmit) {
      throw new ConflictError(result.reason ?? 'Cannot submit');
    }
  }

  /**
   * 사이클의 제출 통계 조회
   */
  async getCycleStats(cycleId: CycleId): Promise<{
    totalSubmissions: number;
    submittedMemberIds: MemberId[];
  }> {
    const submissions = await this.submissionRepo.findByCycle(cycleId);

    return {
      totalSubmissions: submissions.length,
      submittedMemberIds: submissions.map((s) => s.memberId),
    };
  }
}
