// Generation Domain Resolvers

import {
  container,
  GENERATION_REPO_TOKEN,
  MEMBER_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
} from '@/shared/di';
import type {
  GenerationRepository,
  MemberRepository,
  OrganizationRepository,
} from '@/domain';
import {
  CreateGenerationCommand,
  GetAllGenerationsQuery,
  GetGenerationByIdQuery,
} from '@/application';
import { OrganizationId } from '@/domain/organization/organization.domain';
import { DrizzleGenerationMemberRepository } from '@/infrastructure/persistence/drizzle';
import { domainToGraphqlOrganization } from '../mappers';
import { GqlGeneration, GqlGenerationMember, GqlMember } from '../types';
import { GenerationMember } from '@/domain/generation-member/generation-member.domain';
import type { GenerationMemberRepository } from '@/domain/generation-member/generation-member.repository';

// ========================================
// Lazy Dependency Resolution
// ========================================
// Using lazy getters to ensure DI is registered before resolution
// This is needed because modules may be evaluated before registerDependencies() is called

let getAllGenerationsQuery: GetAllGenerationsQuery | null = null;
let getGenerationByIdQuery: GetGenerationByIdQuery | null = null;
let createGenerationCommand: CreateGenerationCommand | null = null;
let generationRepo: GenerationRepository | null = null;
let organizationRepo: OrganizationRepository | null = null;
let generationMemberRepo: GenerationMemberRepository | null = null;
let memberRepo: MemberRepository | null = null;

const getQueries = () => {
  if (
    !getAllGenerationsQuery ||
    !getGenerationByIdQuery ||
    !createGenerationCommand
  ) {
    generationRepo = container.resolve<GenerationRepository>(
      GENERATION_REPO_TOKEN
    );
    organizationRepo = container.resolve<OrganizationRepository>(
      ORGANIZATION_REPO_TOKEN
    );
    generationMemberRepo = new DrizzleGenerationMemberRepository();
    memberRepo = container.resolve<MemberRepository>(MEMBER_REPO_TOKEN);

    getAllGenerationsQuery = new GetAllGenerationsQuery(generationRepo);
    getGenerationByIdQuery = new GetGenerationByIdQuery(generationRepo);
    createGenerationCommand = new CreateGenerationCommand(
      generationRepo,
      organizationRepo
    );
  }
  return {
    getAllGenerationsQuery,
    getGenerationByIdQuery,
    createGenerationCommand,
    generationRepo: generationRepo!,
    organizationRepo: organizationRepo!,
    generationMemberRepo: generationMemberRepo!,
    memberRepo: memberRepo!,
  };
};

// ========================================
// Helper Functions
// ========================================

// Helper 함수: GenerationMember를 GqlGenerationMember로 변환
async function mapToGqlGenerationMember(
  generationMember: GenerationMember,
  memberRepo: MemberRepository
): Promise<GqlGenerationMember> {
  const member = await memberRepo.findById(generationMember.memberId);
  if (!member) {
    throw new Error(`Member ${generationMember.memberId.value} not found`);
  }

  return new GqlGenerationMember(generationMember, new GqlMember(member));
}

async function loadGenerationMembers(
  generationMemberRepo: GenerationMemberRepository,
  memberRepo: MemberRepository,
  generationId: number
): Promise<GqlGenerationMember[]> {
  const generationMembers =
    await generationMemberRepo.findByGeneration(generationId);
  return Promise.all(
    generationMembers.map((generationMember) =>
      mapToGqlGenerationMember(generationMember, memberRepo)
    )
  );
}

async function loadGenerationWithOrganizationAndMembers(
  generation: Awaited<ReturnType<GetGenerationByIdQuery['execute']>>
): Promise<GqlGeneration | null> {
  if (!generation) return null;

  const { organizationRepo, generationMemberRepo, memberRepo } = getQueries();
  const organization = await organizationRepo.findById(
    OrganizationId.create(generation.organizationId)
  );
  const members = await loadGenerationMembers(
    generationMemberRepo,
    memberRepo,
    generation.id.value
  );

  return new GqlGeneration(
    generation,
    organization ? domainToGraphqlOrganization(organization) : undefined,
    undefined,
    members
  );
}

// ========================================
// Resolvers
// ========================================

export const generationQueries = {
  // 기수 전체 조회
  generations: async (organizationSlug?: string): Promise<GqlGeneration[]> => {
    const {
      getAllGenerationsQuery,
      generationRepo,
      organizationRepo,
      generationMemberRepo,
      memberRepo,
    } = getQueries();
    let generations;

    if (organizationSlug) {
      const organization = await organizationRepo.findBySlug(organizationSlug);
      if (!organization) return [];
      generations = await generationRepo.findByOrganization(
        organization.id.value
      );
    } else {
      generations = await getAllGenerationsQuery.execute();
    }

    return Promise.all(
      generations.map(async (gen) => {
        const organization = await organizationRepo.findById(
          OrganizationId.create(gen.organizationId)
        );
        const members = await loadGenerationMembers(
          generationMemberRepo,
          memberRepo,
          gen.id.value
        );

        return new GqlGeneration(
          gen,
          organization ? domainToGraphqlOrganization(organization) : undefined,
          undefined,
          members
        );
      })
    );
  },

  // 기수 단건 조회
  generation: async (id: number): Promise<GqlGeneration | null> => {
    const { getGenerationByIdQuery } = getQueries();
    const generation = await getGenerationByIdQuery.execute(id);
    return loadGenerationWithOrganizationAndMembers(generation);
  },

  // 활성화된 기수 조회
  activeGeneration: async (
    organizationSlug?: string
  ): Promise<GqlGeneration | null> => {
    const { generationRepo, organizationRepo } = getQueries();
    const generation = organizationSlug
      ? await (async () => {
          const organization =
            await organizationRepo.findBySlug(organizationSlug);
          if (!organization) return null;
          return generationRepo.findActiveByOrganization(organization.id.value);
        })()
      : await generationRepo.findActive();
    return loadGenerationWithOrganizationAndMembers(generation);
  },
};

export const generationMutations = {
  // 기수 생성
  addGeneration: async (
    name: string,
    startedAt: string,
    organizationSlug: string
  ): Promise<GqlGeneration> => {
    const { createGenerationCommand } = getQueries();
    const result = await createGenerationCommand.execute({
      name,
      startedAt: new Date(startedAt),
      organizationSlug,
    });

    const generation = await loadGenerationWithOrganizationAndMembers(
      result.generation
    );
    if (!generation) {
      throw new Error('Created generation could not be loaded');
    }
    return generation;
  },
};
