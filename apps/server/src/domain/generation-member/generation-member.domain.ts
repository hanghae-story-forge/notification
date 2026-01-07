// GenerationMember Domain - 기수원 도메인

import { EntityId, AggregateRoot } from '../common/types';
import { GenerationId } from '../generation/generation.domain';
import { MemberId } from '../member/member.domain';

// GenerationMember ID
export class GenerationMemberId extends EntityId {
  static create(value: number): GenerationMemberId {
    return new GenerationMemberId(value);
  }
}

// 도메인 이벤트
export class GenerationMemberJoinedEvent {
  readonly type = 'GenerationMemberJoined' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly generationMemberId: GenerationMemberId,
    public readonly generationId: GenerationId,
    public readonly memberId: MemberId
  ) {
    this.occurredAt = new Date();
  }
}

// 기수원 생성 데이터
export interface CreateGenerationMemberData {
  id?: number;
  generationId: number;
  memberId: number;
  joinedAt?: Date;
}

// 기수원 엔티티
export class GenerationMember extends AggregateRoot<GenerationMemberId> {
  private constructor(
    id: GenerationMemberId,
    private readonly _generationId: GenerationId,
    private readonly _memberId: MemberId,
    private readonly _joinedAt: Date
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 기수원 생성
  static create(data: CreateGenerationMemberData): GenerationMember {
    const id = data.id
      ? GenerationMemberId.create(data.id)
      : GenerationMemberId.create(0);
    const generationId = GenerationId.create(data.generationId);
    const memberId = MemberId.create(data.memberId);
    const joinedAt = data.joinedAt ?? new Date();

    const generationMember = new GenerationMember(
      id,
      generationId,
      memberId,
      joinedAt
    );

    // 도메인 이벤트 발행 (새 생성 시에만)
    if (data.id === 0) {
      generationMember.addDomainEvent(
        new GenerationMemberJoinedEvent(id, generationId, memberId)
      );
    }

    return generationMember;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    generationId: number;
    memberId: number;
    joinedAt: Date;
  }): GenerationMember {
    return GenerationMember.create({
      id: data.id,
      generationId: data.generationId,
      memberId: data.memberId,
      joinedAt: data.joinedAt,
    });
  }

  // Getters
  get generationId(): GenerationId {
    return this._generationId;
  }

  get memberId(): MemberId {
    return this._memberId;
  }

  get joinedAt(): Date {
    return new Date(this._joinedAt);
  }

  // DTO로 변환
  toDTO(): GenerationMemberDTO {
    return {
      id: this.id.value,
      generationId: this._generationId.value,
      memberId: this._memberId.value,
      joinedAt: this._joinedAt.toISOString(),
    };
  }
}

export interface GenerationMemberDTO {
  id: number;
  generationId: number;
  memberId: number;
  joinedAt: string;
}
