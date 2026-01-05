// GetCycleByIdQuery - ID로 사이클 조회 Query

import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { Cycle, CycleId } from '../../domain/cycle/cycle.domain';

/**
 * ID로 사이클 조회 Query (Use Case)
 *
 * 책임:
 * 1. ID로 사이클 조회
 */
export class GetCycleByIdQuery {
  constructor(private readonly cycleRepo: CycleRepository) {}

  async execute(id: number): Promise<Cycle | null> {
    const cycle = await this.cycleRepo.findById(CycleId.create(id));
    return cycle;
  }
}
