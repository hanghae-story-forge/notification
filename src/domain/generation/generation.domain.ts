// Generation Domain - 기수 도메인

import { EntityId, AggregateRoot } from '../common/types';

// Generation ID
export class GenerationId extends EntityId {
  static create(value: number): GenerationId {
    return new GenerationId(value);
  }
}

// 기수 엔티티
export class Generation extends AggregateRoot<GenerationId> {
  private constructor(
    id: GenerationId,
    private readonly _name: string,
    private readonly _startedAt: Date,
    private readonly _isActive: boolean
  ) {
    super(id);
  }

  static create(data: {
    id: number;
    name: string;
    startedAt: Date;
    isActive: boolean;
  }): Generation {
    return new Generation(
      GenerationId.create(data.id),
      data.name,
      data.startedAt,
      data.isActive
    );
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

  toDTO(): GenerationDTO {
    return {
      id: this.id.value,
      name: this._name,
      startedAt: this._startedAt.toISOString(),
      isActive: this._isActive,
    };
  }
}

export interface GenerationDTO {
  id: number;
  name: string;
  startedAt: string;
  isActive: boolean;
}
