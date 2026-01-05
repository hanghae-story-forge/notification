import { injectable, inject } from 'inversify';
import { ICycleRepository, IGenerationRepository } from '@core/domain';
import { TYPES } from '@/di/tokens';

interface UpcomingDeadline {
  cycleId: number;
  cycleName: string;
  generationId: number;
  generationName: string;
  endDate: Date;
  githubIssueUrl: string | null;
}

@injectable()
export class FindUpcomingDeadlinesUseCase {
  constructor(
    @inject(TYPES.CycleRepository)
    private readonly cycleRepo: ICycleRepository,
    @inject(TYPES.GenerationRepository)
    private readonly generationRepo: IGenerationRepository
  ) {}

  async execute(hoursBefore: number): Promise<UpcomingDeadline[]> {
    const activeGeneration = await this.generationRepo.findActive();
    if (!activeGeneration) {
      return [];
    }

    const cycles = await this.cycleRepo.findUpcomingDeadlines(hoursBefore);

    return cycles
      .filter((cycle) => cycle.generationId.equals(activeGeneration.id))
      .map((cycle) => ({
        cycleId: cycle.id.value,
        cycleName: `${activeGeneration.name.value} - ${cycle.getCycleName()}`,
        generationId: cycle.generationId.value,
        generationName: activeGeneration.name.value,
        endDate: cycle.getDeadline(),
        githubIssueUrl: cycle.githubIssueUrl?.value || null,
      }));
  }
}
