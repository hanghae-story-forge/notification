// Generation Repository Interface

import { GenerationId, Generation } from './generation.domain';

export interface GenerationRepository {
  save(generation: Generation): Promise<Generation>;
  findById(id: GenerationId): Promise<Generation | null>;
  findActive(): Promise<Generation | null>;
  findActiveByOrganization(organizationId: number): Promise<Generation | null>;
  findByOrganization(organizationId: number): Promise<Generation[]>;
  findAll(): Promise<Generation[]>;
}
