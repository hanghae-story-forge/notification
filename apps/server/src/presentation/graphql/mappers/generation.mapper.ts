// Generation Mapper

import { Generation } from '@/domain/generation/generation.domain';
import { GqlGeneration } from '../types';

export const domainToGraphqlGeneration = (
  generation: Generation,
  organization?: GqlGeneration['organization']
): GqlGeneration => {
  return new GqlGeneration(generation, organization);
};
