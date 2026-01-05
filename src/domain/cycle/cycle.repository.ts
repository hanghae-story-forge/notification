// Cycle Repository Interface

import { CycleId, Cycle } from './cycle.domain';

export interface CycleRepository {
  findById(id: CycleId): Promise<Cycle | null>;
  findByIssueUrl(issueUrl: string): Promise<Cycle | null>;
  findByGeneration(generationId: number): Promise<Cycle[]>;
  save(cycle: Cycle): Promise<void>;
}
