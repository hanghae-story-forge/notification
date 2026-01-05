// GetReminderTargetsQuery - 리마인더 대상 조회 Query

import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { CycleId } from '../../domain/cycle/cycle.domain';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { SubmissionRepository } from '../../domain/submission/submission.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { NotFoundError } from '../../domain/common/errors';

/**
 * 리마인더 대상 사이클 정보
 */
export interface ReminderCycleInfo {
  cycleId: number;
  cycleName: string;
  endDate: string;
  githubIssueUrl: string | null;
}

/**
 * 미제출자 정보
 */
export interface NotSubmittedMemberInfo {
  github: string;
  name: string;
  discordId: string | null;
}

/**
 * 미제출자 목록 결과
 */
export interface NotSubmittedResult {
  cycleId: number;
  week: number;
  endDate: string;
  notSubmitted: NotSubmittedMemberInfo[];
  submittedCount: number;
  totalMembers: number;
}

/**
 * 리마인더 대상 조회 Query (Use Case)
 *
 * 책임:
 * 1. 마감 임박한 사이클 조회
 * 2. 미제출자 목록 조회
 */
export class GetReminderTargetsQuery {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly memberRepo: MemberRepository
  ) {}

  /**
   * 마감 시간이 특정 시간 내인 사이클 조회
   */
  async getCyclesWithDeadlineIn(
    hoursBefore: number
  ): Promise<ReminderCycleInfo[]> {
    const now = new Date();
    const deadline = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

    // 활성화된 기수 찾기
    const generation = await this.generationRepo.findActive();
    if (!generation) {
      return [];
    }

    // 마감 시간이 deadline 근처인 사이클 찾기
    const cycles = await this.cycleRepo.findCyclesWithDeadlineInRange(
      generation.id.value,
      now,
      deadline
    );

    return cycles.map((cycle) => ({
      cycleId: cycle.id.value,
      cycleName: `${generation.name} - ${cycle.week.toNumber()}주차`,
      endDate: cycle.endDate.toISOString(),
      githubIssueUrl: cycle.githubIssueUrl?.value ?? null,
    }));
  }

  /**
   * 특정 사이클의 미제출자 목록 조회
   */
  async getNotSubmittedMembers(cycleId: number): Promise<NotSubmittedResult> {
    // 사이클 조회
    const cycle = await this.cycleRepo.findById(CycleId.create(cycleId));
    if (!cycle) {
      throw new NotFoundError(`Cycle with ID ${cycleId} not found`);
    }

    // 제출한 멤버 ID 목록
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);
    const submittedIds = new Set(submissions.map((s) => s.memberId.value));

    // 전체 멤버 중 미제출자 필터링
    const allMembers = await this.memberRepo.findAll();
    const notSubmitted = allMembers
      .filter((m) => !submittedIds.has(m.id.value))
      .map((m) => ({
        github: m.githubUsername.value,
        name: m.name.value,
        discordId: m.discordId?.value ?? null,
      }));

    return {
      cycleId: cycle.id.value,
      week: cycle.week.toNumber(),
      endDate: cycle.endDate.toISOString(),
      notSubmitted,
      submittedCount: submissions.length,
      totalMembers: allMembers.length,
    };
  }
}
