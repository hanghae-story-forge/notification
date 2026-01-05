// Generation Repository Interface

import { GenerationId, Generation } from './generation.domain';

export interface GenerationRepository {
  save(generation: Generation): Promise<void>;
  findById(id: GenerationId): Promise<Generation | null>;
  findActive(): Promise<Generation | null>;
  findAll(): Promise<Generation[]>;
}
