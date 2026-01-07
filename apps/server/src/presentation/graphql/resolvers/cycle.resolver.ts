// Cycle Domain Resolvers

import {
  GetCyclesByGenerationQuery,
  GetCycleByIdQuery,
  GetCycleStatusQuery,
  CreateCycleCommand,
} from '@/application';
import {
  DrizzleCycleRepository,
  DrizzleGenerationRepository,
  DrizzleSubmissionRepository,
  DrizzleOrganizationRepository,
  DrizzleOrganizationMemberRepository,
  DrizzleMemberRepository,
} from '@/infrastructure/persistence/drizzle';
import { GqlCycle, GqlCycleStatus } from '../types';
import {
  domainToGraphqlCycle,
  createGqlCycle,
  toGqlCycleStatus,
} from '../mappers';

// ========================================
// Repository Instances
// ========================================

const cycleRepo = new DrizzleCycleRepository();
const generationRepo = new DrizzleGenerationRepository();
const submissionRepo = new DrizzleSubmissionRepository();
const organizationRepo = new DrizzleOrganizationRepository();
const organizationMemberRepo = new DrizzleOrganizationMemberRepository();
const memberRepo = new DrizzleMemberRepository();

// ========================================
// Query & Command Instances
// ========================================

const getCyclesByGenerationQuery = new GetCyclesByGenerationQuery(cycleRepo);
const getCycleByIdQuery = new GetCycleByIdQuery(cycleRepo);
const getCycleStatusQuery = new GetCycleStatusQuery(
  cycleRepo,
  generationRepo,
  organizationRepo,
  submissionRepo,
  organizationMemberRepo,
  memberRepo
);

const createCycleCommand = new CreateCycleCommand(
  cycleRepo,
  generationRepo,
  organizationRepo
);

// ========================================
// Resolvers
// ========================================

export const cycleQueries = {
  // 사이클 목록 조회 (generationId로 필터링 가능)
  cycles: async (generationId?: number): Promise<GqlCycle[]> => {
    const cycles = await getCyclesByGenerationQuery.execute(generationId);
    return cycles.map(domainToGraphqlCycle);
  },

  // 사이클 단건 조회
  cycle: async (id: number): Promise<GqlCycle | null> => {
    const cycle = await getCycleByIdQuery.execute(id);
    return cycle ? domainToGraphqlCycle(cycle) : null;
  },

  // 활성화된 사이클 조회
  activeCycle: async (): Promise<GqlCycle | null> => {
    const currentCycle =
      await getCycleStatusQuery.getCurrentCycle('dongueldonguel');
    if (!currentCycle) return null;

    return createGqlCycle(currentCycle);
  },

  // 사이클별 제출 현황 조회
  cycleStatus: async (
    cycleId: number,
    organizationSlug: string
  ): Promise<GqlCycleStatus> => {
    const status = await getCycleStatusQuery.getCycleStatus(
      cycleId,
      organizationSlug
    );

    return toGqlCycleStatus(status, createGqlCycle);
  },
};

export const cycleMutations = {
  // 사이클 생성
  addCycle: async (
    generationId: number,
    week: number,
    startDate: string,
    endDate: string,
    githubIssueUrl: string,
    organizationSlug: string
  ): Promise<GqlCycle> => {
    const result = await createCycleCommand.execute({
      week,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      githubIssueUrl,
      organizationSlug,
    });
    return domainToGraphqlCycle(result.cycle);
  },

  // 제출 추가 (현재는 GitHub webhook을 통해 처리)
  addSubmission: async (): Promise<never> => {
    throw new Error(
      'addSubmission mutation requires githubUsername and githubIssueUrl. Use the GitHub webhook endpoint instead.'
    );
  },
};
