// Submission Repository Interface - 제출 리포지토리 인터페이스

import { SubmissionId, MemberId, CycleId } from './submission.domain';
import { Submission } from './submission.domain';

/**
 * 제출 리포지토리 인터페이스
 * 도메인 계층에서 정의하며, 구현은 인프라스트럭처 계층에서 제공
 */
export interface SubmissionRepository {
  /**
   * 제출 저장 (생성 또는 업데이트)
   */
  save(submission: Submission): Promise<void>;

  /**
   * ID로 제출 조회
   */
  findById(id: SubmissionId): Promise<Submission | null>;

  /**
   * 사이클과 회원으로 제출 조회 (중복 체크용)
   */
  findByCycleAndMember(
    cycleId: CycleId,
    memberId: MemberId
  ): Promise<Submission | null>;

  /**
   * GitHub Comment ID로 제출 조회 (중복 방지용)
   */
  findByGithubCommentId(commentId: string): Promise<Submission | null>;

  /**
   * 사이클별 모든 제출 조회
   */
  findByCycle(cycleId: CycleId): Promise<Submission[]>;

  /**
   * 사이클 ID로 모든 제출 조회
   */
  findByCycleId(cycleId: CycleId): Promise<Submission[]>;

  /**
   * 회원별 모든 제출 조회
   */
  findByMember(memberId: MemberId): Promise<Submission[]>;

  /**
   * 제출 삭제
   */
  delete(id: SubmissionId): Promise<void>;
}
