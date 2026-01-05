// CreateGenerationCommand - 기수 생성 Command

import { Generation } from '../../domain/generation/generation.domain';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { GenerationService } from '../../domain/generation/generation.service';
import { ValidationError } from '../../domain/common/errors';

/**
 * 기수 생성 Command 요청 데이터
 */
export interface CreateGenerationRequest {
  name: string;
  startedAt: Date;
  isActive?: boolean;
}

/**
 * 기수 생성 Command 결과
 */
export interface CreateGenerationResult {
  generation: Generation;
}

/**
 * 기수 생성 Command (Use Case)
 *
 * 책임:
 * 1. 기수 이름 검증
 * 2. 활성화된 기수가 있는지 확인
 * 3. 기수 생성 및 저장
 */
export class CreateGenerationCommand {
  constructor(
    private readonly generationRepo: GenerationRepository,
    private readonly generationService: GenerationService
  ) {}

  async execute(
    request: CreateGenerationRequest
  ): Promise<CreateGenerationResult> {
    // 1. 기수 이름 검증
    const trimmedName = request.name.trim();
    if (trimmedName.length === 0) {
      throw new ValidationError('Generation name cannot be empty');
    }
    if (trimmedName.length > 50) {
      throw new ValidationError('Generation name cannot exceed 50 characters');
    }

    // 2. 활성화된 기수가 있는지 확인 (isActive가 true인 경우)
    const isActive = request.isActive ?? false;
    await this.generationService.validateNewGeneration(isActive);

    // 3. 기수 생성
    const generation = Generation.create({
      name: trimmedName,
      startedAt: request.startedAt,
      isActive,
    });

    // 4. 저장
    const savedGeneration = await this.generationRepo.save(generation);

    return {
      generation: savedGeneration,
    };
  }
}
