// GraphQL Resolvers - DDD Compliant
// 모든 데이터 접근은 Application Layer (Query/Command)를 통해 이루어집니다

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
} from '@/infrastructure/persistence/drizzle';

import { MemberService } from '@/domain/member/member.service';
import { GenerationService } from '@/domain/generation/generation.service';
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

const memberService = new MemberService(memberRepo);
const generationService = new GenerationService(generationRepo);

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
  submissionRepo,
  memberRepo
);

// ========================================
// Command Instances
// ========================================

const createMemberCommand = new CreateMemberCommand(memberRepo, memberService);
const createGenerationCommand = new CreateGenerationCommand(
  generationRepo,
  generationService
);
const createCycleCommand = new CreateCycleCommand(cycleRepo, generationRepo);

// ========================================
// Helper Functions
// ========================================

const domainToGraphqlMember = (member: Member) => ({
  id: member.id.value,
  github: member.githubUsername.value,
  discordId: member.discordId?.value ?? null,
  name: member.name.value,
  createdAt: member.createdAt.toISOString(),
});

const domainToGraphqlGeneration = (generation: Generation) => ({
  id: generation.id.value,
  name: generation.name,
  startedAt: generation.startedAt.toISOString(),
  isActive: generation.isActive,
  createdAt: generation.createdAt.toISOString(),
});

const domainToGraphqlCycle = (cycle: Cycle) => ({
  id: cycle.id.value,
  generationId: cycle.generationId,
  week: cycle.week.value,
  startDate: cycle.startDate.toISOString(),
  endDate: cycle.endDate.toISOString(),
  githubIssueUrl: cycle.githubIssueUrl?.value ?? null,
  createdAt: cycle.createdAt.toISOString(),
});

// ========================================
// Resolvers
// ========================================

export const resolvers = {
  Query: {
    // 멤버 조회
    members: async () => {
      const members = await getAllMembersQuery.execute();
      return members.map(domainToGraphqlMember);
    },

    member: async (_: unknown, args: { github: string }) => {
      const member = await getMemberByGithubQuery.execute(args.github);
      return member ? domainToGraphqlMember(member) : null;
    },

    // 기수 조회
    generations: async () => {
      const generations = await getAllGenerationsQuery.execute();
      return generations.map(domainToGraphqlGeneration);
    },

    generation: async (_: unknown, args: { id: number }) => {
      const generation = await getGenerationByIdQuery.execute(args.id);
      return generation ? domainToGraphqlGeneration(generation) : null;
    },

    activeGeneration: async () => {
      const generation = await generationRepo.findActive();
      return generation ? domainToGraphqlGeneration(generation) : null;
    },

    // 사이클 조회
    cycles: async (_: unknown, args: { generationId?: number }) => {
      const cycles = await getCyclesByGenerationQuery.execute(
        args.generationId
      );
      return cycles.map(domainToGraphqlCycle);
    },

    cycle: async (_: unknown, args: { id: number }) => {
      const cycle = await getCycleByIdQuery.execute(args.id);
      return cycle ? domainToGraphqlCycle(cycle) : null;
    },

    activeCycle: async () => {
      const currentCycle = await getCycleStatusQuery.getCurrentCycle();
      if (!currentCycle) return null;

      return {
        id: currentCycle.id,
        generationId: 0, // GetCycleStatusQuery에서 generationId를 반환하지 않음
        week: currentCycle.week,
        startDate: currentCycle.startDate,
        endDate: currentCycle.endDate,
        githubIssueUrl: currentCycle.githubIssueUrl,
        createdAt: currentCycle.startDate, // 임시값
      };
    },

    // 제출 현황
    cycleStatus: async (_: unknown, args: { cycleId: number }) => {
      const status = await getCycleStatusQuery.getCycleStatus(args.cycleId);

      return {
        cycle: {
          id: status.cycle.id,
          generationId: 0, // GetCycleStatusQuery에서 반환하지 않음
          week: status.cycle.week,
          startDate: status.cycle.startDate,
          endDate: status.cycle.endDate,
          githubIssueUrl: null, // GetCycleStatusQuery에서 반환하지 않음
          createdAt: status.cycle.startDate,
        },
        summary: status.summary,
        submitted: status.submitted.map((s: SubmittedMember) => ({
          member: {
            id: 0, // submitted 데이터에 id가 없음
            github: s.github,
            discordId: null,
            name: s.name,
            createdAt: s.submittedAt,
          },
          url: s.url,
          submittedAt: s.submittedAt,
        })),
        notSubmitted: status.notSubmitted.map((m: NotSubmittedMember) => ({
          id: 0, // notSubmitted 데이터에 id가 없음
          github: m.github,
          discordId: null,
          name: m.name,
          createdAt: new Date().toISOString(),
        })),
      };
    },
  },

  Mutation: {
    addMember: async (
      _: unknown,
      args: { github: string; name: string; discordId?: string }
    ) => {
      const result = await createMemberCommand.execute({
        githubUsername: args.github,
        name: args.name,
        discordId: args.discordId,
      });
      return domainToGraphqlMember(result.member);
    },

    addGeneration: async (
      _: unknown,
      args: { name: string; startedAt: string }
    ) => {
      const result = await createGenerationCommand.execute({
        name: args.name,
        startedAt: new Date(args.startedAt),
      });
      return domainToGraphqlGeneration(result.generation);
    },

    addCycle: async (
      _: unknown,
      args: {
        generationId: number;
        week: number;
        startDate: string;
        endDate: string;
        githubIssueUrl: string;
      }
    ) => {
      // GraphQL 스키마에서 generationId를 받지만, CreateCycleCommand는 활성화된 기수를 사용합니다
      const result = await createCycleCommand.execute({
        week: args.week,
        startDate: new Date(args.startDate),
        endDate: new Date(args.endDate),
        githubIssueUrl: args.githubIssueUrl,
      });
      return domainToGraphqlCycle(result.cycle);
    },

    addSubmission: async (
      _unknown: unknown,
      _args: {
        cycleId: number;
        memberId: number;
        url: string;
        githubCommentId?: string;
      }
    ) => {
      // RecordSubmissionCommand는 githubUsername과 githubIssueUrl을 필요로 합니다
      // 여기서는 memberId와 cycleId만 있으므로, 추가 정보가 필요합니다
      throw new Error(
        'addSubmission mutation requires githubUsername and githubIssueUrl. Use the GitHub webhook endpoint instead.'
      );
    },
  },
};
