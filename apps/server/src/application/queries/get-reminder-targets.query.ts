// GetReminderTargetsQuery - 리마인더 대상 조회 Query

import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { CycleId } from '../../domain/cycle/cycle.domain';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { SubmissionRepository } from '../../domain/submission/submission.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';
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
  organizationSlug: string; // 조직 식별자 추가
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
 * 1. 특정 조직의 마감 임박한 사이클 조회
 * 2. 해당 조직의 활성 멤버 중 미제출자 목록 조회
 */
export class GetReminderTargetsQuery {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly organizationRepo: OrganizationRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly memberRepo: MemberRepository
  ) {}

  /**
   * 특정 조직의 마감 시간이 특정 시간 내인 사이클 조회
   */
  async getCyclesWithDeadlineIn(
    organizationSlug: string,
    hoursBefore: number
  ): Promise<ReminderCycleInfo[]> {
    // 조직 조회
    const organization =
      await this.organizationRepo.findBySlug(organizationSlug);
    if (!organization) {
      return [];
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

    // 해당 조직의 마감 시간이 deadline 근처인 사이클 찾기
    const cycles =
      await this.cycleRepo.findCyclesWithDeadlineInRangeByOrganization(
        organization.id.value,
        now,
        deadline
      );

    return cycles.map((cycle) => ({
      cycleId: cycle.id.value,
      cycleName: `${cycle.week.toNumber()}주차`,
      endDate: cycle.endDate.toISOString(),
      githubIssueUrl: cycle.githubIssueUrl?.value ?? null,
      organizationSlug: organization.slug.value,
    }));
  }

  /**
   * 특정 사이클의 미제출자 목록 조회 (조직 멤버만)
   */
  async getNotSubmittedMembers(
    cycleId: number,
    organizationSlug: string
  ): Promise<NotSubmittedResult> {
    // 조직 조회
    const organization =
      await this.organizationRepo.findBySlug(organizationSlug);
    if (!organization) {
      throw new NotFoundError(`Organization "${organizationSlug}" not found`);
    }

    // 사이클 조회
    const cycle = await this.cycleRepo.findById(CycleId.create(cycleId));
    if (!cycle) {
      throw new NotFoundError(`Cycle with ID ${cycleId} not found`);
    }

    // 제출한 멤버 ID 목록
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);
    const submittedIds = new Set(submissions.map((s) => s.memberId.value));

    // 해당 조직의 활성 멤버 목록
    const orgMembers =
      await this.organizationMemberRepo.findActiveByOrganization(
        organization.id
      );

    // 활성 멤버 중 미제출자 필터링
    const notSubmitted: NotSubmittedMemberInfo[] = [];
    for (const orgMember of orgMembers) {
      if (!submittedIds.has(orgMember.memberId.value)) {
        const member = await this.memberRepo.findById(orgMember.memberId);
        if (member) {
          notSubmitted.push({
            github: member.githubUsername?.value ?? '',
            name: member.name.value,
            discordId: member.discordId.value,
          });
        }
      }
    }

    return {
      cycleId: cycle.id.value,
      week: cycle.week.toNumber(),
      endDate: cycle.endDate.toISOString(),
      notSubmitted,
      submittedCount: submissions.length,
      totalMembers: orgMembers.length,
    };
  }
}
