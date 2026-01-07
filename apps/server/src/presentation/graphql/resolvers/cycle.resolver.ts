// Cycle Domain Resolvers

import {
  container,
  CYCLE_REPO_TOKEN,
  GENERATION_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
  SUBMISSION_REPO_TOKEN,
  ORGANIZATION_MEMBER_REPO_TOKEN,
  MEMBER_REPO_TOKEN,
} from '@/shared/di';
import type {
  CycleRepository,
  GenerationRepository,
  OrganizationRepository,
  SubmissionRepository,
  OrganizationMemberRepository,
  MemberRepository,
} from '@/domain';
import {
  GetCyclesByGenerationQuery,
  GetCycleByIdQuery,
  GetCycleStatusQuery,
  CreateCycleCommand,
} from '@/application';
import { GqlCycle, GqlCycleStatus, GqlGeneration } from '../types';
import {
  domainToGraphqlCycle,
  createGqlCycle,
  toGqlCycleStatus,
  domainToGraphqlGeneration,
  domainToGraphqlOrganization,
} from '../mappers';
import { GenerationId } from '@/domain/generation/generation.domain';
import { OrganizationId } from '@/domain/organization/organization.domain';

// ========================================
// Resolve Dependencies from Container
// ========================================

const cycleRepo = container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);
const generationRepo = container.resolve<GenerationRepository>(
  GENERATION_REPO_TOKEN
);
const organizationRepo = container.resolve<OrganizationRepository>(
  ORGANIZATION_REPO_TOKEN
);
const submissionRepo = container.resolve<SubmissionRepository>(
  SUBMISSION_REPO_TOKEN
);
const organizationMemberRepo = container.resolve<OrganizationMemberRepository>(
  ORGANIZATION_MEMBER_REPO_TOKEN
);
const memberRepo = container.resolve<MemberRepository>(MEMBER_REPO_TOKEN);

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
// Helper Functions
// ========================================

async function loadGenerationWithOrganization(
  generationId: number
): Promise<GqlGeneration | undefined> {
  const generation = await generationRepo.findById(
    GenerationId.create(generationId)
  );

  if (!generation) return undefined;

  const organization = await organizationRepo.findById(
    OrganizationId.create(generation.organizationId)
  );

  return domainToGraphqlGeneration(
    generation,
    organization ? domainToGraphqlOrganization(organization) : undefined
  );
}

async function loadCycleWithGeneration(
  cycle: Awaited<ReturnType<typeof getCycleByIdQuery.execute>>
): Promise<GqlCycle | null> {
  if (!cycle) return null;

  const generation = await loadGenerationWithOrganization(cycle.generationId);

  return domainToGraphqlCycle(cycle, generation);
}

// ========================================
// Resolvers
// ========================================

export const cycleQueries = {
  // 사이클 목록 조회 (generationId로 필터링 가능)
  cycles: async (generationId?: number): Promise<GqlCycle[]> => {
    const cycles = await getCyclesByGenerationQuery.execute(generationId);
    const results = await Promise.all(
      cycles.map(async (cycle) => {
        const generation = await loadGenerationWithOrganization(
          cycle.generationId
        );
        return domainToGraphqlCycle(cycle, generation);
      })
    );
    return results;
  },

  // 사이클 단건 조회
  cycle: async (id: number): Promise<GqlCycle | null> => {
    const cycle = await getCycleByIdQuery.execute(id);
    return loadCycleWithGeneration(cycle);
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
    const generation = await loadGenerationWithOrganization(
      result.cycle.generationId
    );
    return domainToGraphqlCycle(result.cycle, generation);
  },

  // 제출 추가 (현재는 GitHub webhook을 통해 처리)
  addSubmission: async (): Promise<never> => {
    throw new Error(
      'addSubmission mutation requires githubUsername and githubIssueUrl. Use the GitHub webhook endpoint instead.'
    );
  },
};
