// Member Domain - 회원 도메인

import { EntityId, AggregateRoot } from '../common/types';

// Member ID
export class MemberId extends EntityId {
  static create(value: number): MemberId {
    return new MemberId(value);
  }
}

// 회원 엔티티
export class Member extends AggregateRoot<MemberId> {
  private constructor(
    id: MemberId,
    private readonly _github: string,
    private readonly _name: string,
    private readonly _discordId?: string
  ) {
    super(id);
  }

  static create(data: {
    id: number;
    github: string;
    name: string;
    discordId?: string;
  }): Member {
    return new Member(
      MemberId.create(data.id),
      data.github,
      data.name,
      data.discordId
    );
  }

  get github(): string {
    return this._github;
  }

  get name(): string {
    return this._name;
  }

  get discordId(): string | undefined {
    return this._discordId;
  }

  toDTO(): MemberDTO {
    return {
      id: this.id.value,
      github: this._github,
      name: this._name,
      discordId: this._discordId,
    };
  }
}

export interface MemberDTO {
  id: number;
  github: string;
  name: string;
  discordId?: string;
}
