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
} from '@/infrastructure/persistence/drizzle';
import { domainToGraphqlOrganization } from '../mappers';
import { GqlGeneration } from '../types';

// ========================================
// Repository Instances
// ========================================

const generationRepo = new DrizzleGenerationRepository();
const organizationRepo = new DrizzleOrganizationRepository();

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

async function loadGenerationWithOrganization(
  generation: Awaited<ReturnType<typeof getGenerationByIdQuery.execute>>
): Promise<GqlGeneration | null> {
  if (!generation) return null;

  const organization = await organizationRepo.findById(
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
    const generations = await getAllGenerationsQuery.execute();
    const results = await Promise.all(
      generations.map(async (gen) => {
        const organization = await organizationRepo.findById(
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
    const generation = await getGenerationByIdQuery.execute(id);
    return loadGenerationWithOrganization(generation);
  },

  // 활성화된 기수 조회
  activeGeneration: async (): Promise<GqlGeneration | null> => {
    const generation = await generationRepo.findActive();
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
    const result = await createGenerationCommand.execute({
      name,
      startedAt: new Date(startedAt),
      organizationSlug,
    });
    const organization = await organizationRepo.findById(
      OrganizationId.create(result.generation.organizationId)
    );
    return new GqlGeneration(
      result.generation,
      organization ? domainToGraphqlOrganization(organization) : undefined
    );
  },
};
