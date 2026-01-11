// Generation Repository Interface

import { GenerationId, Generation } from './generation.domain';

export interface GenerationRepository {
  save(generation: Generation): Promise<Generation>;
  findById(id: GenerationId): Promise<Generation | null>;
  findActive(): Promise<Generation | null>;
  findActiveByOrganization(organizationId: number): Promise<Generation | null>;
  findByOrganization(organizationId: number): Promise<Generation[]>;
  findAll(): Promise<Generation[]>;

  // 모든 기수를 사이클 수와 기수원 수와 함께 조회 (N+1 해결)
  findAllWithStats(): Promise<
    Array<{
      generation: Generation;
      cycleCount: number;
      memberCount: number;
    }>
  >;
}
