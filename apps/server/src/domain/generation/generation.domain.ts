// Generation Domain - 기수 도메인

import { EntityId, AggregateRoot } from '../common/types';

// Generation ID
export class GenerationId extends EntityId {
  static create(value: number): GenerationId {
    return new GenerationId(value);
  }
}

// 도메인 이벤트
export class GenerationActivatedEvent {
  readonly type = 'GenerationActivated' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly generationId: GenerationId,
    public readonly organizationId: number,
    public readonly name: string
  ) {
    this.occurredAt = new Date();
  }
}

export class GenerationDeactivatedEvent {
  readonly type = 'GenerationDeactivated' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly generationId: GenerationId,
    public readonly organizationId: number,
    public readonly name: string
  ) {
    this.occurredAt = new Date();
  }
}

// 기수 생성 데이터
export interface CreateGenerationData {
  id?: number;
  organizationId: number; // 조직 ID 추가
  name: string;
  startedAt: Date;
  isActive: boolean;
  createdAt?: Date;
}

// 기수 엔티티 (Aggregate Root)
export class Generation extends AggregateRoot<GenerationId> {
  private constructor(
    id: GenerationId,
    private readonly _organizationId: number,
    private readonly _name: string,
    private readonly _startedAt: Date,
    private readonly _isActive: boolean,
    private readonly _createdAt: Date
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 기수 생성
  static create(data: CreateGenerationData): Generation {
    // 기수 이름 검증
    const trimmedName = data.name.trim();
    if (trimmedName.length === 0) {
      throw new Error('Generation name cannot be empty');
    }
    if (trimmedName.length > 50) {
      throw new Error('Generation name cannot exceed 50 characters');
    }

    const id = data.id ? GenerationId.create(data.id) : GenerationId.create(0);
    const createdAt = data.createdAt ?? new Date();
    const generation = new Generation(
      id,
      data.organizationId,
      trimmedName,
      data.startedAt,
      data.isActive,
      createdAt
    );

    // 도메인 이벤트 발행 (새 생성 시에만)
    if (data.id === 0) {
      if (data.isActive) {
        generation.addDomainEvent(
          new GenerationActivatedEvent(id, data.organizationId, trimmedName)
        );
      }
    }

    return generation;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    organizationId: number;
    name: string;
    startedAt: Date;
    isActive: boolean;
    createdAt: Date;
  }): Generation {
    return Generation.create({
      id: data.id,
      organizationId: data.organizationId,
      name: data.name,
      startedAt: data.startedAt,
      isActive: data.isActive,
      createdAt: data.createdAt,
    });
  }

  // Getters
  get organizationId(): number {
    return this._organizationId;
  }

  get name(): string {
    return this._name;
  }

  get startedAt(): Date {
    return new Date(this._startedAt);
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  // 비즈니스 로직: 활성화 상태 확인
  isCurrentGeneration(): boolean {
    return this._isActive;
  }

  // 비즈니스 로직: 기수가 시작된 지 특정 일수가 지났는지 확인
  hasPassedDays(days: number): boolean {
    const now = new Date();
    const daysPassed =
      (now.getTime() - this._startedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysPassed >= days;
  }

  // DTO로 변환
  toDTO(): GenerationDTO {
    return {
      id: this.id.value,
      organizationId: this._organizationId,
      name: this._name,
      startedAt: this._startedAt.toISOString(),
      isActive: this._isActive,
    };
  }
}

export interface GenerationDTO {
  id: number;
  organizationId: number;
  name: string;
  startedAt: string;
  isActive: boolean;
}
