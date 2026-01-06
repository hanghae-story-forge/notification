// Pylon GraphQL Service - Code-First Approach
// Pylon은 TypeScript 정의로부터 GraphQL 스키마를 자동 생성합니다

import { app } from '@getcronit/pylon';
import {
  GetAllMembersQuery,
  GetMemberByGithubQuery,
  GetAllGenerationsQuery,
  GetGenerationByIdQuery,
  GetCyclesByGenerationQuery,
  GetCycleByIdQuery,
  GetCycleStatusQuery,
  CreateMemberCommand,
  CreateGenerationCommand,
  CreateCycleCommand,
  type SubmittedMember,
  type NotSubmittedMember,
} from '@/application';

import {
  DrizzleMemberRepository,
  DrizzleGenerationRepository,
  DrizzleCycleRepository,
  DrizzleSubmissionRepository,
  DrizzleOrganizationRepository,
  DrizzleOrganizationMemberRepository,
} from '@/infrastructure/persistence/drizzle';

import { MemberService } from '@/domain/member/member.service';
import { Member } from '@/domain/member/member.domain';
import { Generation } from '@/domain/generation/generation.domain';
import { Cycle } from '@/domain/cycle/cycle.domain';

// ========================================
// Repository & Service Instances
// ========================================

const memberRepo = new DrizzleMemberRepository();
const generationRepo = new DrizzleGenerationRepository();
const cycleRepo = new DrizzleCycleRepository();
const submissionRepo = new DrizzleSubmissionRepository();
const organizationRepo = new DrizzleOrganizationRepository();
const organizationMemberRepo = new DrizzleOrganizationMemberRepository();

const memberService = new MemberService(memberRepo);

// ========================================
// Query Instances
// ========================================

const getAllMembersQuery = new GetAllMembersQuery(memberRepo);
const getMemberByGithubQuery = new GetMemberByGithubQuery(memberRepo);
const getAllGenerationsQuery = new GetAllGenerationsQuery(generationRepo);
const getGenerationByIdQuery = new GetGenerationByIdQuery(generationRepo);
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

// ========================================
// Command Instances
// ========================================

const createMemberCommand = new CreateMemberCommand(memberRepo, memberService);
const createGenerationCommand = new CreateGenerationCommand(
  generationRepo,
  organizationRepo
);
const createCycleCommand = new CreateCycleCommand(
  cycleRepo,
  generationRepo,
  organizationRepo
);

// ========================================
// GraphQL Types & Services (Pylon Code-First)
// ========================================

// Pylon 스키마 자동 생성을 위한 DTO 클래스들
class GqlMember {
  id: number;
  github: string;
  discordId: string | null;
  name: string;
  createdAt: string;

  constructor(member: Member) {
    this.id = member.id.value;
    this.github = member.githubUsername?.value ?? '';
    this.discordId = member.discordId?.value ?? null;
    this.name = member.name.value;
    this.createdAt = member.createdAt.toISOString();
  }
}

class GqlGeneration {
  id: number;
  name: string;
  startedAt: string;
  isActive: boolean;
  createdAt: string;

  constructor(generation: Generation) {
    this.id = generation.id.value;
    this.name = generation.name;
    this.startedAt = generation.startedAt.toISOString();
    this.isActive = generation.isActive;
    this.createdAt = generation.createdAt.toISOString();
  }
}

class GqlCycle {
  id: number;
  generationId: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  createdAt: string;

  constructor(cycle: Cycle) {
    this.id = cycle.id.value;
    this.generationId = cycle.generationId;
    this.week = cycle.week.value;
    this.startDate = cycle.startDate.toISOString();
    this.endDate = cycle.endDate.toISOString();
    this.githubIssueUrl = cycle.githubIssueUrl?.value ?? null;
    this.createdAt = cycle.createdAt.toISOString();
  }
}

class GqlCycleSummary {
  total!: number;
  submitted!: number;
  notSubmitted!: number;
}

class GqlMemberSubmission {
  member!: GqlMember;
  url!: string;
  submittedAt!: string;
}

class GqlCycleStatus {
  cycle!: GqlCycle;
  summary!: GqlCycleSummary;
  submitted!: GqlMemberSubmission[];
  notSubmitted!: GqlMember[];
}

// ========================================
// Helper Functions
// ========================================

const domainToGraphqlMember = (member: Member): GqlMember => {
  return new GqlMember(member);
};

const domainToGraphqlGeneration = (generation: Generation): GqlGeneration => {
  return new GqlGeneration(generation);
};

const domainToGraphqlCycle = (cycle: Cycle): GqlCycle => {
  return new GqlCycle(cycle);
};

const createGqlMember = (
  id: number,
  github: string,
  name: string,
  createdAt: string
): GqlMember => {
  const gqlMember = new GqlMember({
    id: { value: id },
    githubUsername: { value: github },
    name: { value: name },
    discordId: undefined,
    createdAt: new Date(createdAt),
  } as unknown as Member);
  return gqlMember;
};

const createGqlCycle = (data: {
  id: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl?: string | null;
}): GqlCycle => {
  const gqlCycle = new GqlCycle({
    id: { value: data.id },
    generationId: 0,
    week: { value: data.week },
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    githubIssueUrl: data.githubIssueUrl
      ? { value: data.githubIssueUrl }
      : undefined,
    createdAt: new Date(data.startDate),
  } as unknown as Cycle);
  return gqlCycle;
};

const submittedMemberToGraphql = (
  data: SubmittedMember
): GqlMemberSubmission => {
  const submission = new GqlMemberSubmission();
  submission.member = createGqlMember(
    0,
    data.github,
    data.name,
    data.submittedAt
  );
  submission.url = data.url;
  submission.submittedAt = data.submittedAt;
  return submission;
};

const notSubmittedMemberToGraphql = (data: NotSubmittedMember): GqlMember => {
  return createGqlMember(0, data.github, data.name, new Date().toISOString());
};

// ========================================
// GraphQL API Definition (Pylon)
// ========================================

export const graphql = {
  Query: {
    // 멤버 전체 조회
    members: async (): Promise<GqlMember[]> => {
      const members = await getAllMembersQuery.execute();
      return members.map(domainToGraphqlMember);
    },

    // 멤버 단건 조회 (GitHub username으로)
    member: async (_: unknown, github: string): Promise<GqlMember | null> => {
      const member = await getMemberByGithubQuery.execute(github);
      return member ? domainToGraphqlMember(member) : null;
    },

    // 기수 전체 조회
    generations: async (): Promise<GqlGeneration[]> => {
      const generations = await getAllGenerationsQuery.execute();
      return generations.map(domainToGraphqlGeneration);
    },

    // 기수 단건 조회
    generation: async (
      _: unknown,
      id: number
    ): Promise<GqlGeneration | null> => {
      const generation = await getGenerationByIdQuery.execute(id);
      return generation ? domainToGraphqlGeneration(generation) : null;
    },

    // 활성화된 기수 조회
    activeGeneration: async (): Promise<GqlGeneration | null> => {
      const generation = await generationRepo.findActive();
      return generation ? domainToGraphqlGeneration(generation) : null;
    },

    // 사이클 목록 조회 (generationId로 필터링 가능)
    cycles: async (_: unknown, generationId?: number): Promise<GqlCycle[]> => {
      const cycles = await getCyclesByGenerationQuery.execute(generationId);
      return cycles.map(domainToGraphqlCycle);
    },

    // 사이클 단건 조회
    cycle: async (_: unknown, id: number): Promise<GqlCycle | null> => {
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
      _: unknown,
      cycleId: number,
      organizationSlug: string
    ): Promise<GqlCycleStatus> => {
      const status = await getCycleStatusQuery.getCycleStatus(
        cycleId,
        organizationSlug
      );

      const cycleStatus = new GqlCycleStatus();
      cycleStatus.cycle = createGqlCycle(status.cycle);

      const summary = new GqlCycleSummary();
      summary.total = status.summary.total;
      summary.submitted = status.summary.submitted;
      summary.notSubmitted = status.summary.notSubmitted;
      cycleStatus.summary = summary;

      cycleStatus.submitted = status.submitted.map(submittedMemberToGraphql);
      cycleStatus.notSubmitted = status.notSubmitted.map(
        notSubmittedMemberToGraphql
      );

      return cycleStatus;
    },
  },

  Mutation: {
    // 멤버 추가
    addMember: async (
      _: unknown,
      github: string,
      name: string,
      discordId?: string
    ): Promise<GqlMember> => {
      const result = await createMemberCommand.execute({
        githubUsername: github,
        name,
        discordId,
      });
      return domainToGraphqlMember(result.member);
    },

    // 기수 생성
    addGeneration: async (
      _: unknown,
      name: string,
      startedAt: string,
      organizationSlug: string
    ): Promise<GqlGeneration> => {
      const result = await createGenerationCommand.execute({
        name,
        startedAt: new Date(startedAt),
        organizationSlug,
      });
      return domainToGraphqlGeneration(result.generation);
    },

    // 사이클 생성
    addCycle: async (
      _: unknown,
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
    addSubmission: async (
      _unknown: unknown,
      _cycleId: number,
      _memberId: number,
      _url: string,
      _githubCommentId?: string
    ): Promise<never> => {
      throw new Error(
        'addSubmission mutation requires githubUsername and githubIssueUrl. Use the GitHub webhook endpoint instead.'
      );
    },
  },
};

// Pylon app export
export default app;
