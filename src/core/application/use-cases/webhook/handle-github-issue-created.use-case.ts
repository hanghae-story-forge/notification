import { injectable, inject } from 'inversify';
import { ICycleRepository, IGenerationRepository } from '@core/domain';
import { IGitHubParserService } from '@core/application/ports/services';
import { Cycle, WeekNumber, GitHubIssueUrl } from '@core/domain/cycle';
import { DateRange } from '@core/domain/shared';
import { NotFoundException } from '@core/domain/shared';
import { TYPES } from '@/di/tokens';

interface HandleGitHubIssueCreatedRequest {
  issueData: unknown;
}

interface HandleGitHubIssueCreatedResponse {
  cycleId: number;
  week: number;
  startDate: Date;
  endDate: Date;
}

@injectable()
export class HandleGitHubIssueCreatedUseCase {
  constructor(
    @inject(TYPES.CycleRepository)
    private readonly cycleRepo: ICycleRepository,
    @inject(TYPES.GenerationRepository)
    private readonly generationRepo: IGenerationRepository,
    @inject(TYPES.GitHubParserService)
    private readonly githubParserService: IGitHubParserService
  ) {}

  async execute(
    request: HandleGitHubIssueCreatedRequest
  ): Promise<HandleGitHubIssueCreatedResponse> {
    // 1. Parse GitHub issue data
    const parsedData = await this.githubParserService.parseIssue(request.issueData);

    // 2. Find active generation
    const activeGeneration = await this.generationRepo.findActive();
    if (!activeGeneration) {
      throw new NotFoundException('Active Generation');
    }

    // 3. Check if cycle already exists for this week
    const existingCycle = await this.cycleRepo.findByGenerationAndWeek(
      activeGeneration.id,
      parsedData.week
    );
    if (existingCycle) {
      return {
        cycleId: existingCycle.id.value,
        week: existingCycle.week.value,
        startDate: existingCycle.dateRange.startDate,
        endDate: existingCycle.dateRange.endDate,
      };
    }

    // 4. Create cycle
    const cycle = Cycle.create(
      activeGeneration.id,
      new WeekNumber(parsedData.week),
      new DateRange(parsedData.startDate, parsedData.endDate),
      new GitHubIssueUrl(parsedData.githubIssueUrl)
    );

    // 5. Save cycle
    const savedCycle = await this.cycleRepo.save(cycle);

    return {
      cycleId: savedCycle.id.value,
      week: savedCycle.week.value,
      startDate: savedCycle.dateRange.startDate,
      endDate: savedCycle.dateRange.endDate,
    };
  }
}
