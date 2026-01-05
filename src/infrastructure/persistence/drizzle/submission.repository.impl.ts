// Submission Repository Implementation - Drizzle ORM

import { eq, and } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { submissions } from '../../../db/schema';
import {
  Submission,
  SubmissionId,
  MemberId,
  CycleId,
} from '../../../domain/submission/submission.domain';
import { SubmissionRepository } from '../../../domain/submission/submission.repository';

/**
 * Drizzle ORM을 사용한 SubmissionRepository 구현
 */
export class DrizzleSubmissionRepository implements SubmissionRepository {
  async save(submission: Submission): Promise<void> {
    const dto = submission.toDTO();

    // ID가 0이면 새로운 제출 (생성)
    if (dto.id === 0) {
      await db.insert(submissions).values({
        cycleId: dto.cycleId,
        memberId: dto.memberId,
        url: dto.url,
        githubCommentId: dto.githubCommentId,
        submittedAt: new Date(dto.submittedAt),
      });
    } else {
      // 기존 제출 업데이트 (현재 요구사항에서는 사용하지 않음)
      await db
        .update(submissions)
        .set({
          url: dto.url,
        })
        .where(eq(submissions.id, dto.id));
    }
  }

  async findById(id: SubmissionId): Promise<Submission | null> {
    const result = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByCycleAndMember(
    cycleId: CycleId,
    memberId: MemberId
  ): Promise<Submission | null> {
    const result = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.cycleId, cycleId.value),
          eq(submissions.memberId, memberId.value)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByGithubCommentId(commentId: string): Promise<Submission | null> {
    const result = await db
      .select()
      .from(submissions)
      .where(eq(submissions.githubCommentId, commentId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByCycle(cycleId: CycleId): Promise<Submission[]> {
    const result = await db
      .select()
      .from(submissions)
      .where(eq(submissions.cycleId, cycleId.value));

    return result.map((row) => this.mapToEntity(row));
  }

  async findByCycleId(cycleId: CycleId): Promise<Submission[]> {
    return this.findByCycle(cycleId);
  }

  async findByMember(memberId: MemberId): Promise<Submission[]> {
    const result = await db
      .select()
      .from(submissions)
      .where(eq(submissions.memberId, memberId.value));

    return result.map((row) => this.mapToEntity(row));
  }

  async delete(id: SubmissionId): Promise<void> {
    await db.delete(submissions).where(eq(submissions.id, id.value));
  }

  /**
   * DB 레코드를 도메인 엔티티로 변환
   */
  private mapToEntity(row: {
    id: number;
    cycleId: number;
    memberId: number;
    url: string;
    submittedAt: Date;
    githubCommentId: string | null;
  }): Submission {
    return Submission.reconstitute({
      id: row.id,
      cycleId: row.cycleId,
      memberId: row.memberId,
      url: row.url,
      submittedAt: row.submittedAt,
      githubCommentId: row.githubCommentId ?? '',
    });
  }
}
