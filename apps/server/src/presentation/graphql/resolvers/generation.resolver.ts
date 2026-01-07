// Generation Domain Resolvers

import {
  CreateGenerationCommand,
  GetAllGenerationsQuery,
  GetGenerationByIdQuery,
} from '@/application';
import { OrganizationId } from '@/domain/organization/organization.domain';
import {
  DrizzleGenerationRepository,
  DrizzleOrganizationRepository,
  DrizzleGenerationMemberRepository,
  DrizzleMemberRepository,
} from '@/infrastructure/persistence/drizzle';
import { domainToGraphqlOrganization } from '../mappers';
import { GqlGeneration, GqlGenerationMember } from '../types';
import { GenerationMember } from '@/domain/generation-member/generation-member.domain';
import { Member } from '@/domain/member/member.domain';

// ========================================
// Repository Instances
// ========================================

const generationRepo = new DrizzleGenerationRepository();
const organizationRepo = new DrizzleOrganizationRepository();
const generationMemberRepo = new DrizzleGenerationMemberRepository();
const memberRepo = new DrizzleMemberRepository();

// ========================================
// Query & Command Instances
// ========================================

const getAllGenerationsQuery = new GetAllGenerationsQuery(generationRepo);
const getGenerationByIdQuery = new GetGenerationByIdQuery(generationRepo);
const createGenerationCommand = new CreateGenerationCommand(
  generationRepo,
  organizationRepo
);

// ========================================
// Helper Functions
// ========================================

// Helper 함수: GenerationMember를 GqlGenerationMember로 변환
async function mapToGqlGenerationMember(
  generationMember: GenerationMember
): Promise<GqlGenerationMember> {
  const member = await memberRepo.findById(generationMember.memberId);
  if (!member) {
    throw new Error(`Member ${generationMember.memberId.value} not found`);
  }

  return new GqlGenerationMember(generationMember, {
    id: member.id.value,
    github: member.githubUsername?.value ?? '',
    discordId: member.discordId.value,
    name: member.name.value,
    createdAt: member.createdAt.toISOString(),
  });
}

async function loadGenerationWithOrganizationAndMembers(
  generation: Awaited<ReturnType<typeof getGenerationByIdQuery.execute>>
): Promise<GqlGeneration | null> {
  if (!generation) return null;

  const organization = await organizationRepo.findById(
    OrganizationId.create(generation.organizationId)
  );

  const generationMembers =
    await generationMemberRepo.findByGeneration(generation.id.value);
  const members = await Promise.all(
    generationMembers.map(mapToGqlGenerationMember)
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
  generations: async (): Promise<GqlGeneration[]> => {
    const generations = await getAllGenerationsQuery.execute();
    const results = await Promise.all(
      generations.map(async (gen) => {
        const organization = await organizationRepo.findById(
          OrganizationId.create(gen.organizationId)
        );

        const generationMembers =
          await generationMemberRepo.findByGeneration(gen.id.value);
        const members = await Promise.all(
          generationMembers.map(mapToGqlGenerationMember)
        );

        return new GqlGeneration(
          gen,
          organization ? domainToGraphqlOrganization(organization) : undefined,
          undefined,
          members
        );
      })
    );
    return results;
  },

  // 기수 단건 조회
  generation: async (id: number): Promise<GqlGeneration | null> => {
    const generation = await getGenerationByIdQuery.execute(id);
    return loadGenerationWithOrganizationAndMembers(generation);
  },

  // 활성화된 기수 조회
  activeGeneration: async (): Promise<GqlGeneration | null> => {
    const generation = await generationRepo.findActive();
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
    const result = await createGenerationCommand.execute({
      name,
      startedAt: new Date(startedAt),
      organizationSlug,
    });
    const organization = await organizationRepo.findById(
      OrganizationId.create(result.generation.organizationId)
    );

    const generationMembers =
      await generationMemberRepo.findByGeneration(result.generation.id.value);
    const members = await Promise.all(
      generationMembers.map(mapToGqlGenerationMember)
    );

    return new GqlGeneration(
      result.generation,
      organization ? domainToGraphqlOrganization(organization) : undefined,
      undefined,
      members
    );
  },
};
