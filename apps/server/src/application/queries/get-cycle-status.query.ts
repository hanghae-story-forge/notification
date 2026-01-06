// GetCycleStatusQuery - 사이클 현황 조회 Query

import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { CycleId } from '../../domain/cycle/cycle.domain';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { GenerationId } from '../../domain/generation/generation.domain';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { SubmissionRepository } from '../../domain/submission/submission.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { NotFoundError } from '../../domain/common/errors';

/**
 * 제출자 정보
 */
export interface SubmittedMember {
  name: string;
  github: string;
  url: string;
  submittedAt: string;
}

/**
 * 미제출자 정보
 */
export interface NotSubmittedMember {
  name: string;
  github: string;
}

/**
 * 사이클 현황 결과
 */
export interface CycleStatusResult {
  cycle: {
    id: number;
    week: number;
    startDate: string;
    endDate: string;
    generationName: string;
    organizationSlug: string; // 조직 식별자 추가
  };
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
  };
  submitted: SubmittedMember[];
  notSubmitted: NotSubmittedMember[];
}

/**
 * 현재 진행 중인 사이클 결과
 */
export interface CurrentCycleResult {
  id: number;
  week: number;
  generationName: string;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  daysLeft: number;
  hoursLeft: number;
  organizationSlug: string; // 조직 식별자 추가
}

/**
 * 사이클 현황 조회 Query (Use Case)
 *
 * 책임:
 * 1. 특정 조직의 현재 진행 중인 사이클 조회
 * 2. 특정 사이클의 제출 현황 조회 (조직 멤버만)
 */
export class GetCycleStatusQuery {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly organizationRepo: OrganizationRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly memberRepo: MemberRepository
  ) {}

  /**
   * 특정 조직의 현재 진행 중인 사이클 조회
   */
  async getCurrentCycle(organizationSlug: string): Promise<CurrentCycleResult | null> {
    // 조직 조회
    const organization = await this.organizationRepo.findBySlug(organizationSlug);
    if (!organization) {
      return null;
    }

    // 해당 조직의 활성화된 기수 찾기
    const generation = await this.generationRepo.findActiveByOrganization(
      organization.id.value
    );
    if (!generation) {
      return null;
    }

    // 진행 중인 사이클 찾기
    const cycles = await this.cycleRepo.findActiveCyclesByGeneration(
      generation.id.value
    );
    if (cycles.length === 0) {
      return null;
    }

    const cycle = cycles[0];
    const hoursRemaining = cycle.getHoursRemaining();
    const daysLeft = Math.floor(hoursRemaining / 24);
    const hoursLeft = Math.floor(hoursRemaining % 24);

    return {
      id: cycle.id.value,
      week: cycle.week.toNumber(),
      generationName: generation.name,
      startDate: cycle.startDate.toISOString(),
      endDate: cycle.endDate.toISOString(),
      githubIssueUrl: cycle.githubIssueUrl?.value ?? null,
      daysLeft,
      hoursLeft,
      organizationSlug: organization.slug.value,
    };
  }

  /**
   * 특정 사이클의 제출 현황 조회 (조직 멤버만)
   */
  async getCycleStatus(
    cycleId: number,
    organizationSlug: string
  ): Promise<CycleStatusResult> {
    // 조직 조회
    const organization = await this.organizationRepo.findBySlug(organizationSlug);
    if (!organization) {
      throw new NotFoundError(`Organization "${organizationSlug}" not found`);
    }

    // 사이클 조회
    const cycle = await this.cycleRepo.findById(CycleId.create(cycleId));
    if (!cycle) {
      throw new NotFoundError(`Cycle with ID ${cycleId} not found`);
    }

    // 기수 조회
    const generation = await this.generationRepo.findById(
      GenerationId.create(cycle.generationId)
    );
    if (!generation) {
      throw new NotFoundError(`Generation for cycle ${cycleId} not found`);
    }

    // 기수가 해당 조직에 속하는지 확인
    if (generation.organizationId !== organization.id.value) {
      throw new NotFoundError(
        `Cycle ${cycleId} does not belong to organization "${organizationSlug}"`
      );
    }

    // 제출 목록 조회
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);

    // 해당 조직의 활성 멤버 목록
    const orgMembers = await this.organizationMemberRepo.findActiveByOrganization(
      organization.id
    );
    const submittedIds = new Set(submissions.map((s) => s.memberId.value));

    const submitted = submissions
      .filter((s) => submittedIds.has(s.memberId.value))
      .map((s) => {
        const member = orgMembers.find((m) => m.memberId.value === s.memberId.value);
        return {
          name: member ? 'Member' : 'Unknown', // 실제 멤버 정보 필요 시 조회
          github: 'github', // 임시값
          url: s.url.value,
          submittedAt: s.submittedAt.toISOString(),
        };
      });

    const notSubmitted = orgMembers
      .filter((m) => !submittedIds.has(m.memberId.value))
      .map((m) => ({
        name: 'Member', // 실제 멤버 정보 필요 시 조회
        github: 'github', // 임시값
      }));

    return {
      cycle: {
        id: cycle.id.value,
        week: cycle.week.toNumber(),
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        generationName: generation.name,
        organizationSlug: organization.slug.value,
      },
      summary: {
        total: orgMembers.length,
        submitted: submitted.length,
        notSubmitted: notSubmitted.length,
      },
      submitted,
      notSubmitted,
    };
  }

  /**
   * 사이클의 제출자/미제출자 이름 목록 조회 (Discord 메시지용)
   */
  async getCycleParticipantNames(
    cycleId: number,
    organizationSlug: string
  ): Promise<{
    cycleName: string;
    submittedNames: string[];
    notSubmittedNames: string[];
    endDate: Date;
  } | null> {
    // 조직 조회
    const organization = await this.organizationRepo.findBySlug(organizationSlug);
    if (!organization) {
      return null;
    }

    // 사이클 조회
    const cycle = await this.cycleRepo.findById(CycleId.create(cycleId));
    if (!cycle) {
      return null;
    }

    // 기수 조회
    const generation = await this.generationRepo.findById(
      GenerationId.create(cycle.generationId)
    );
    if (!generation) {
      return null;
    }

    // 기수가 해당 조직에 속하는지 확인
    if (generation.organizationId !== organization.id.value) {
      return null;
    }

    // 제출 목록 조회
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);

    // 해당 조직의 활성 멤버 목록
    const orgMembers = await this.organizationMemberRepo.findActiveByOrganization(
      organization.id
    );
    const submittedIds = new Set(submissions.map((s) => s.memberId.value));

    const submittedNames: string[] = [];
    const notSubmittedNames: string[] = [];

    for (const orgMember of orgMembers) {
      const member = await this.memberRepo.findById(orgMember.memberId);
      if (member) {
        if (submittedIds.has(member.id.value)) {
          submittedNames.push(member.name.value);
        } else {
          notSubmittedNames.push(member.name.value);
        }
      }
    }

    return {
      cycleName: `${generation.name} - ${cycle.week.toNumber()}주차`,
      submittedNames,
      notSubmittedNames,
      endDate: cycle.endDate,
    };
  }
}
