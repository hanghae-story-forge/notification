// Member Domain - 회원 도메인

import { EntityId, AggregateRoot } from '../common/types';
import { MemberName, GithubUsername, DiscordId } from './member.vo';

// Member ID
export class MemberId extends EntityId {
  static create(value: number): MemberId {
    return new MemberId(value);
  }
}

// 도메인 이벤트
export class MemberRegisteredEvent {
  readonly type = 'MemberRegistered' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly memberId: MemberId,
    public readonly githubUsername: GithubUsername
  ) {
    this.occurredAt = new Date();
  }
}

// 회원 생성 데이터
export interface CreateMemberData {
  id?: number;
  githubUsername: string;
  name: string;
  discordId?: string;
  createdAt?: Date;
}

// 회원 엔티티 (Aggregate Root)
export class Member extends AggregateRoot<MemberId> {
  private constructor(
    id: MemberId,
    private readonly _githubUsername: GithubUsername,
    private readonly _name: MemberName,
    private readonly _discordId: DiscordId | null,
    private readonly _createdAt: Date
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 회원 생성
  static create(data: CreateMemberData): Member {
    const githubUsername = GithubUsername.create(data.githubUsername);
    const name = MemberName.create(data.name);
    const discordId = DiscordId.createOrNull(data.discordId);

    const id = data.id ? MemberId.create(data.id) : MemberId.create(0);
    const createdAt = data.createdAt ?? new Date();
    const member = new Member(id, githubUsername, name, discordId, createdAt);

    // 도메인 이벤트 발행 (새 생성 시에만)
    if (data.id === 0) {
      member.addDomainEvent(new MemberRegisteredEvent(id, githubUsername));
    }

    return member;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    github: string;
    name: string;
    discordId?: string;
    createdAt: Date;
  }): Member {
    return Member.create({
      id: data.id,
      githubUsername: data.github,
      name: data.name,
      discordId: data.discordId,
      createdAt: data.createdAt,
    });
  }

  // Getters
  get githubUsername(): GithubUsername {
    return this._githubUsername;
  }

  get name(): MemberName {
    return this._name;
  }

  get discordId(): DiscordId | null {
    return this._discordId;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  // 비즈니스 로직: GitHub 사용자명으로 회원 식별
  matchesGithubUsername(username: string): boolean {
    return this._githubUsername.value === username;
  }

  // 비즈니스 로직: Discord 연동되어 있는지 확인
  hasDiscordLinked(): boolean {
    return this._discordId !== null;
  }

  // DTO로 변환
  toDTO(): MemberDTO {
    return {
      id: this.id.value,
      githubUsername: this._githubUsername.value,
      name: this._name.value,
      discordId: this._discordId?.value,
    };
  }
}

export interface MemberDTO {
  id: number;
  githubUsername: string;
  name: string;
  discordId?: string;
}
