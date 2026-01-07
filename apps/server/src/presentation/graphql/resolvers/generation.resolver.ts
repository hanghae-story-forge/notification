// Generation Domain Resolvers

import {
  GetAllGenerationsQuery,
  GetGenerationByIdQuery,
  CreateGenerationCommand,
} from '@/application';
import {
  DrizzleGenerationRepository,
  DrizzleOrganizationRepository,
} from '@/infrastructure/persistence/drizzle';
import { GqlGeneration } from '../types';
import { domainToGraphqlGeneration } from '../mappers';

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
// Resolvers
// ========================================

export const generationQueries = {
  // 기수 전체 조회
  generations: async (): Promise<GqlGeneration[]> => {
    const generations = await getAllGenerationsQuery.execute();
    return generations.map(domainToGraphqlGeneration);
  },

  // 기수 단건 조회
  generation: async (id: number): Promise<GqlGeneration | null> => {
    const generation = await getGenerationByIdQuery.execute(id);
    return generation ? domainToGraphqlGeneration(generation) : null;
  },

  // 활성화된 기수 조회
  activeGeneration: async (): Promise<GqlGeneration | null> => {
    const generation = await generationRepo.findActive();
    return generation ? domainToGraphqlGeneration(generation) : null;
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
    return domainToGraphqlGeneration(result.generation);
  },
};
