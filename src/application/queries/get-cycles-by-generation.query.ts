// GetCyclesByGenerationQuery - 기수별 사이클 조회 Query

import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { Cycle } from '../../domain/cycle/cycle.domain';

/**
 * 기수별 사이클 조회 Query (Use Case)
 *
 * 책임:
 * 1. 기수 ID로 사이클 목록 조회
 * 2. 전체 사이클 목록 조회 (generationId가 없는 경우)
 *
 * 참고: 전체 사이클 조회는 현재 지원하지 않음 (CycleRepository에 findAll 없음)
 */
export class GetCyclesByGenerationQuery {
  constructor(private readonly cycleRepo: CycleRepository) {}

  async execute(generationId?: number): Promise<Cycle[]> {
    if (generationId) {
      return await this.cycleRepo.findByGeneration(generationId);
    }
    // 전체 조회는 현재 지원하지 않음 - 빈 배열 반환
    return [];
  }
}
