// Member Domain - 회원 도메인

import { EntityId, AggregateRoot } from '../common/types';
import {
  MemberName,
  GithubUsername,
  DiscordId,
  DiscordUsername,
} from './member.vo';

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
    public readonly discordId: DiscordId
  ) {
    this.occurredAt = new Date();
  }
}

// 회원 생성 데이터
export interface CreateMemberData {
  id?: number;
  discordId: string; // Discord ID (필수)
  discordUsername?: string; // Discord username (선택)
  discordAvatar?: string; // Discord avatar hash (선택)
  githubUsername?: string; // GitHub username (선택, 더 이상 unique 아님)
  name: string;
  createdAt?: Date;
}

// 회원 엔티티 (Aggregate Root)
export class Member extends AggregateRoot<MemberId> {
  private constructor(
    id: MemberId,
    private _discordId: DiscordId,
    private _discordUsername: DiscordUsername | null,
    private _discordAvatar: string | null,
    private _githubUsername: GithubUsername | null,
    private readonly _name: MemberName,
    private readonly _createdAt: Date
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 회원 생성 (Discord OAuth로 가입)
  static create(data: CreateMemberData): Member {
    const discordId = DiscordId.create(data.discordId);
    const discordUsername = data.discordUsername
      ? DiscordUsername.create(data.discordUsername)
      : null;
    const discordAvatar = data.discordAvatar ?? null;
    const githubUsername = data.githubUsername
      ? GithubUsername.create(data.githubUsername)
      : null;
    const name = MemberName.create(data.name);

    const id = data.id ? MemberId.create(data.id) : MemberId.create(0);
    const createdAt = data.createdAt ?? new Date();
    const member = new Member(
      id,
      discordId,
      discordUsername,
      discordAvatar,
      githubUsername,
      name,
      createdAt
    );

    // 도메인 이벤트 발행 (새 생성 시에만)
    if (data.id === 0) {
      member.addDomainEvent(new MemberRegisteredEvent(id, discordId));
    }

    return member;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    discordId: string;
    discordUsername?: string;
    discordAvatar?: string;
    githubUsername?: string;
    name: string;
    createdAt: Date;
  }): Member {
    const id = MemberId.create(data.id);
    const discordId = DiscordId.reconstitute(data.discordId);
    const discordUsername = data.discordUsername
      ? DiscordUsername.reconstitute(data.discordUsername)
      : null;
    const discordAvatar = data.discordAvatar ?? null;
    const githubUsername = data.githubUsername
      ? GithubUsername.reconstitute(data.githubUsername)
      : null;
    const name = MemberName.reconstitute(data.name);
    const createdAt = data.createdAt;

    return new Member(
      id,
      discordId,
      discordUsername,
      discordAvatar,
      githubUsername,
      name,
      createdAt
    );
  }

  // Getters
  get discordId(): DiscordId {
    return this._discordId;
  }

  get discordUsername(): DiscordUsername | null {
    return this._discordUsername;
  }

  get discordAvatar(): string | null {
    return this._discordAvatar;
  }

  get githubUsername(): GithubUsername | null {
    return this._githubUsername;
  }

  get name(): MemberName {
    return this._name;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  // 비즈니스 로직: Discord ID로 회원 식별
  matchesDiscordId(discordId: string): boolean {
    return this._discordId.value === discordId;
  }

  // 비즈니스 로직: GitHub 사용자명이 있는지 확인
  hasGithubLinked(): boolean {
    return this._githubUsername !== null;
  }

  // 비즈니스 로직: GitHub 사용자명 업데이트
  updateGithubUsername(username: string): void {
    this._githubUsername = GithubUsername.create(username);
  }

  // 비즈니스 로직: Discord username 업데이트 (사용자 변경 가능)
  updateDiscordUsername(username: string): void {
    this._discordUsername = DiscordUsername.create(username);
  }

  // 비즈니스 로직: Discord avatar 업데이트
  updateDiscordAvatar(avatar: string): void {
    this._discordAvatar = avatar;
  }

  // DTO로 변환
  toDTO(): MemberDTO {
    return {
      id: this.id.value,
      discordId: this._discordId.value,
      discordUsername: this._discordUsername?.value,
      discordAvatar: this._discordAvatar ?? undefined,
      githubUsername: this._githubUsername?.value,
      name: this._name.value,
    };
  }
}

export interface MemberDTO {
  id: number;
  discordId: string;
  discordUsername?: string;
  discordAvatar?: string;
  githubUsername?: string;
  name: string;
}
