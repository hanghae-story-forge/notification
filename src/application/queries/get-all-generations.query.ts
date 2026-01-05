// GetAllGenerationsQuery - 전체 기수 조회 Query

import { GenerationRepository } from '../../domain/generation/generation.repository';
import { Generation } from '../../domain/generation/generation.domain';

/**
 * 전체 기수 조회 Query (Use Case)
 *
 * 책임:
 * 1. 전체 기수 목록 조회
 */
export class GetAllGenerationsQuery {
  constructor(private readonly generationRepo: GenerationRepository) {}

  async execute(): Promise<Generation[]> {
    return await this.generationRepo.findAll();
  }
}
