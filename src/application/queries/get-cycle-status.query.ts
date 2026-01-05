// GetCycleStatusQuery - 사이클 현황 조회 Query

import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { SubmissionRepository } from '../../domain/submission/submission.repository';
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
  githubIssueUrl?: string;
  daysLeft: number;
  hoursLeft: number;
}

/**
 * 사이클 현황 조회 Query (Use Case)
 *
 * 책임:
 * 1. 현재 진행 중인 사이클 조회
 * 2. 특정 사이클의 제출 현황 조회
 */
export class GetCycleStatusQuery {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly memberRepo: MemberRepository
  ) {}

  /**
   * 현재 진행 중인 사이클 조회
   */
  async getCurrentCycle(): Promise<CurrentCycleResult | null> {
    // 활성화된 기수 찾기
    const generation = await this.generationRepo.findActive();
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
      githubIssueUrl: cycle.githubIssueUrl?.value,
      daysLeft,
      hoursLeft,
    };
  }

  /**
   * 특정 사이클의 제출 현황 조회
   */
  async getCycleStatus(cycleId: number): Promise<CycleStatusResult> {
    // 사이클 조회
    const cycle = await this.cycleRepo.findById(
      cycleId // CycleId는 내부에서 생성 필요
    );
    if (!cycle) {
      throw new NotFoundError(`Cycle with ID ${cycleId} not found`);
    }

    // 기수 조회
    const generation = await this.generationRepo.findById(
      cycle.generationId // GenerationId는 내부에서 생성 필요
    );
    if (!generation) {
      throw new NotFoundError(`Generation for cycle ${cycleId} not found`);
    }

    // 제출 목록 조회
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);

    // 전체 멤버
    const allMembers = await this.memberRepo.findAll();
    const submittedIds = new Set(submissions.map((s) => s.memberId.value));

    const submitted = submissions.map((s) => {
      const member = allMembers.find((m) => m.id.value === s.memberId.value);
      return {
        name: member?.name.value ?? 'Unknown',
        github: member?.githubUsername.value ?? 'unknown',
        url: s.url.value,
        submittedAt: s.submittedAt.toISOString(),
      };
    });

    const notSubmitted = allMembers
      .filter((m) => !submittedIds.has(m.id.value))
      .map((m) => ({
        name: m.name.value,
        github: m.githubUsername.value,
      }));

    return {
      cycle: {
        id: cycle.id.value,
        week: cycle.week.toNumber(),
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        generationName: generation.name,
      },
      summary: {
        total: allMembers.length,
        submitted: submissions.length,
        notSubmitted: notSubmitted.length,
      },
      submitted,
      notSubmitted,
    };
  }

  /**
   * 사이클의 제출자/미제출자 이름 목록 조회 (Discord 메시지용)
   */
  async getCycleParticipantNames(cycleId: number): Promise<{
    cycleName: string;
    submittedNames: string[];
    notSubmittedNames: string[];
    endDate: Date;
  } | null> {
    // 사이클 조회
    const cycle = await this.cycleRepo.findById(
      cycleId // CycleId는 내부에서 생성 필요
    );
    if (!cycle) {
      return null;
    }

    // 기수 조회
    const generation = await this.generationRepo.findById(
      cycle.generationId // GenerationId는 내부에서 생성 필요
    );
    if (!generation) {
      return null;
    }

    // 제출 목록 조회
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);

    // 전체 멤버
    const allMembers = await this.memberRepo.findAll();
    const submittedIds = new Set(submissions.map((s) => s.memberId.value));

    const submittedNames = allMembers
      .filter((m) => submittedIds.has(m.id.value))
      .map((m) => m.name.value);

    const notSubmittedNames = allMembers
      .filter((m) => !submittedIds.has(m.id.value))
      .map((m) => m.name.value);

    return {
      cycleName: `${generation.name} - ${cycle.week.toNumber()}주차`,
      submittedNames,
      notSubmittedNames,
      endDate: cycle.endDate,
    };
  }
}
