// Generation Repository Interface

import { GenerationId, Generation } from './generation.domain';

export interface GenerationRepository {
  findById(id: GenerationId): Promise<Generation | null>;
  findActive(): Promise<Generation>;
  save(generation: Generation): Promise<void>;
}
