// GetGenerationByIdQuery - ID로 기수 조회 Query

import { GenerationRepository } from '../../domain/generation/generation.repository';
import {
  Generation,
  GenerationId,
} from '../../domain/generation/generation.domain';

/**
 * ID로 기수 조회 Query (Use Case)
 *
 * 책임:
 * 1. ID로 기수 조회
 */
export class GetGenerationByIdQuery {
  constructor(private readonly generationRepo: GenerationRepository) {}

  async execute(id: number): Promise<Generation | null> {
    const generation = await this.generationRepo.findById(
      GenerationId.create(id)
    );
    return generation;
  }
}
