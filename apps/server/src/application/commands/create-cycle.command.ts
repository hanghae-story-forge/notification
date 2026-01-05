// CreateCycleCommand - 사이클 생성 Command

import { Cycle } from '../../domain/cycle/cycle.domain';
import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { ConflictError } from '../../domain/common/errors';

/**
 * 사이클 생성 Command 요청 데이터
 */
export interface CreateCycleRequest {
  week: number;
  startDate?: Date;
  endDate?: Date;
  githubIssueUrl: string;
}

/**
 * 사이클 생성 Command 결과
 */
export interface CreateCycleResult {
  cycle: Cycle;
  generationName: string;
}

/**
 * 사이클 생성 Command (Use Case)
 *
 * 책임:
 * 1. 활성화된 기수를 찾는다
 * 2. 이미 동일한 주차의 사이클이 있는지 확인한다
 * 3. 사이클을 생성하고 저장한다
 */
export class CreateCycleCommand {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly generationRepo: GenerationRepository
  ) {}

  async execute(request: CreateCycleRequest): Promise<CreateCycleResult> {
    // 1. 활성화된 기수 찾기
    const generation = await this.generationRepo.findActive();
    if (!generation) {
      throw new ConflictError('No active generation found');
    }

    // 2. 이미 동일한 주차가 있는지 확인
    const existing = await this.cycleRepo.findByGenerationAndWeek(
      generation.id.value,
      request.week
    );
    if (existing) {
      throw new ConflictError(
        `Cycle with week ${request.week} already exists for generation ${generation.name}`
      );
    }

    // 3. 날짜 계산 (기본값: 현재부터 7일간)
    const now = new Date();
    const startDate = request.startDate ?? now;
    const endDate =
      request.endDate ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 4. 사이클 생성
    const cycle = Cycle.create({
      generationId: generation.id.value,
      week: request.week,
      startDate,
      endDate,
      githubIssueUrl: request.githubIssueUrl,
    });

    // 5. 저장
    await this.cycleRepo.save(cycle);

    return {
      cycle,
      generationName: generation.name,
    };
  }
}
