import { MemberId, GitHubUsername, MemberName, DiscordId } from '../shared';

export class Member {
  constructor(
    private readonly _id: MemberId,
    private readonly _github: GitHubUsername,
    private readonly _name: MemberName,
    private readonly _discordId: DiscordId | null,
    private readonly _createdAt: Date
  ) {}

  get id(): MemberId {
    return this._id;
  }

  get github(): GitHubUsername {
    return this._github;
  }

  get name(): MemberName {
    return this._name;
  }

  get discordId(): DiscordId | null {
    return this._discordId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  hasDiscordAccount(): boolean {
    return this._discordId !== null;
  }

  equals(other: Member): boolean {
    return this._id.equals(other.id);
  }

  static create(
    github: GitHubUsername,
    name: MemberName,
    discordId: DiscordId | null = null
  ): Member {
    return new Member(MemberId.create(), github, name, discordId, new Date());
  }
}
