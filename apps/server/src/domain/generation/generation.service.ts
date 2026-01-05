// Generation Domain Service

import { GenerationRepository } from './generation.repository';
import { GenerationId, Generation } from './generation.domain';
import { NotFoundError, ConflictError } from '../common/errors';

/**
 * 기수 도메인 서비스
 *
 * 책임:
 * - 기수 조회 관련 비즈니스 로직
 * - 기수 활성화/비활성화 관련 로직
 */
export class GenerationService {
  constructor(private readonly generationRepo: GenerationRepository) {}

  /**
   * 활성화된 기수를 찾고, 없으면 에러를 발생
   */
  async findActiveGenerationOrThrow(): Promise<Generation> {
    const generation = await this.generationRepo.findActive();
    if (!generation) {
      throw new NotFoundError('No active generation found');
    }
    return generation;
  }

  /**
   * 기수 ID로 기수를 찾고, 없으면 에러를 발생
   */
  async findGenerationByIdOrThrow(id: GenerationId): Promise<Generation> {
    const generation = await this.generationRepo.findById(id);
    if (!generation) {
      throw new NotFoundError(`Generation with ID ${id.value} not found`);
    }
    return generation;
  }

  /**
   * 새 기수 생성 시 검증 (활성화된 기수가 이미 있는지 확인)
   */
  async validateNewGeneration(isActive: boolean): Promise<void> {
    if (isActive) {
      const activeGeneration = await this.generationRepo.findActive();
      if (activeGeneration) {
        throw new ConflictError(
          `Cannot activate new generation: "${activeGeneration.name}" is already active`
        );
      }
    }
  }

  /**
   * 기수 활성화
   */
  async activateGeneration(id: GenerationId): Promise<void> {
    const generation = await this.findGenerationByIdOrThrow(id);

    if (generation.isActive) {
      throw new ConflictError(
        `Generation "${generation.name}" is already active`
      );
    }

    // 다른 활성화된 기수가 있는지 확인
    const activeGeneration = await this.generationRepo.findActive();
    if (activeGeneration) {
      throw new ConflictError(
        `Cannot activate: "${activeGeneration.name}" is already active`
      );
    }

    // 새로운 활성화된 기수 생성
    const activatedGeneration = Generation.create({
      id: generation.id.value,
      name: generation.name,
      startedAt: generation.startedAt,
      isActive: true,
    });

    await this.generationRepo.save(activatedGeneration);
  }

  /**
   * 기수 비활성화
   */
  async deactivateGeneration(id: GenerationId): Promise<void> {
    const generation = await this.findGenerationByIdOrThrow(id);

    if (!generation.isActive) {
      throw new ConflictError(`Generation "${generation.name}" is not active`);
    }

    // 비활성화된 기수 생성
    const deactivatedGeneration = Generation.create({
      id: generation.id.value,
      name: generation.name,
      startedAt: generation.startedAt,
      isActive: false,
    });

    await this.generationRepo.save(deactivatedGeneration);
  }
}
