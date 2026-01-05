import { CycleId } from '../shared';
import { Cycle } from './cycle.entity';
import { GenerationId, GitHubIssueUrl } from '../shared';

export abstract class ICycleRepository {
  abstract save(cycle: Cycle): Promise<Cycle>;
  abstract findById(id: CycleId): Promise<Cycle | null>;
  abstract findByGitHubIssueUrl(url: GitHubIssueUrl): Promise<Cycle | null>;
  abstract findByGeneration(generationId: GenerationId): Promise<Cycle[]>;
  abstract findByGenerationAndWeek(
    generationId: GenerationId,
    week: number
  ): Promise<Cycle | null>;
  abstract findActiveCycles(): Promise<Cycle[]>;
  abstract findUpcomingDeadlines(hours: number): Promise<Cycle[]>;
  abstract findCurrentCycle(generationId: GenerationId): Promise<Cycle | null>;
}
