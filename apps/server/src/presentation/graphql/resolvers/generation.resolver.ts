// Generation Domain Resolvers

import {
  container,
  GENERATION_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
} from '@/shared/di';
import type { GenerationRepository, OrganizationRepository } from '@/domain';
import {
  CreateGenerationCommand,
  GetAllGenerationsQuery,
  GetGenerationByIdQuery,
} from '@/application';
import { OrganizationId } from '@/domain/organization/organization.domain';
import { domainToGraphqlOrganization } from '../mappers';
import { GqlGeneration } from '../types';

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
    generationRepo,
    organizationRepo,
  };
};

// ========================================
// Helper Functions
// ========================================

async function loadGenerationWithOrganization(
  generation: Awaited<ReturnType<(typeof getGenerationByIdQuery)['execute']>>
): Promise<GqlGeneration | null> {
  if (!generation) return null;

  const { organizationRepo } = getQueries();
  const organization = await organizationRepo!.findById(
    OrganizationId.create(generation.organizationId)
  );
  return new GqlGeneration(
    generation,
    organization ? domainToGraphqlOrganization(organization) : undefined
  );
}

// ========================================
// Resolvers
// ========================================

export const generationQueries = {
  // 기수 전체 조회
  generations: async (): Promise<GqlGeneration[]> => {
    const { getAllGenerationsQuery, organizationRepo } = getQueries();
    const generations = await getAllGenerationsQuery.execute();
    const results = await Promise.all(
      generations.map(async (gen) => {
        const organization = await organizationRepo!.findById(
          OrganizationId.create(gen.organizationId)
        );
        return new GqlGeneration(
          gen,
          organization ? domainToGraphqlOrganization(organization) : undefined
        );
      })
    );
    return results;
  },

  // 기수 단건 조회
  generation: async (id: number): Promise<GqlGeneration | null> => {
    const { getGenerationByIdQuery } = getQueries();
    const generation = await getGenerationByIdQuery.execute(id);
    return loadGenerationWithOrganization(generation);
  },

  // 활성화된 기수 조회
  activeGeneration: async (): Promise<GqlGeneration | null> => {
    const { generationRepo } = getQueries();
    const generation = await generationRepo!.findActive();
    return loadGenerationWithOrganization(generation);
  },
};

export const generationMutations = {
  // 기수 생성
  addGeneration: async (
    name: string,
    startedAt: string,
    organizationSlug: string
  ): Promise<GqlGeneration> => {
    const { createGenerationCommand, organizationRepo } = getQueries();
    const result = await createGenerationCommand.execute({
      name,
      startedAt: new Date(startedAt),
      organizationSlug,
    });
    const organization = await organizationRepo!.findById(
      OrganizationId.create(result.generation.organizationId)
    );
    return new GqlGeneration(
      result.generation,
      organization ? domainToGraphqlOrganization(organization) : undefined
    );
  },
};
