// CreateGenerationCommand - 기수 생성 Command

import { Generation } from '../../domain/generation/generation.domain';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { ValidationError } from '../../domain/common/errors';

/**
 * 기수 생성 Command 요청 데이터
 */
export interface CreateGenerationRequest {
  organizationSlug: string; // 조직 식별
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
 * 1. 조직 존재 확인
 * 2. 기수 이름 검증
 * 3. 활성화된 기수가 있는지 확인 (같은 조직 내)
 * 4. 기수 생성 및 저장
 */
export class CreateGenerationCommand {
  constructor(
    private readonly generationRepo: GenerationRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(
    request: CreateGenerationRequest
  ): Promise<CreateGenerationResult> {
    // 1. 조직 존재 확인
    const organization = await this.organizationRepo.findBySlug(
      request.organizationSlug
    );
    if (!organization) {
      throw new ValidationError(
        `Organization "${request.organizationSlug}" not found`
      );
    }

    // 2. 기수 이름 검증
    const trimmedName = request.name.trim();
    if (trimmedName.length === 0) {
      throw new ValidationError('Generation name cannot be empty');
    }
    if (trimmedName.length > 50) {
      throw new ValidationError('Generation name cannot exceed 50 characters');
    }

    // 3. 활성화된 기수가 있는지 확인 (같은 조직 내)
    const isActive = request.isActive ?? false;
    if (isActive) {
      const activeGeneration =
        await this.generationRepo.findActiveByOrganization(
          organization.id.value
        );
      if (activeGeneration) {
        throw new ValidationError(
          `Organization "${request.organizationSlug}" already has an active generation`
        );
      }
    }

    // 4. 기수 생성
    const generation = Generation.create({
      organizationId: organization.id.value,
      name: trimmedName,
      startedAt: request.startedAt,
      isActive,
    });

    // 5. 저장
    const savedGeneration = await this.generationRepo.save(generation);

    return {
      generation: savedGeneration,
    };
  }
}
