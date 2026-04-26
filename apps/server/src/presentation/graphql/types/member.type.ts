// GraphQL Member Type

import { Member } from '@/domain/member/member.domain';

export class GqlMember {
  id: number;
  github: string;
  githubUsername: string;
  discordId: string | null;
  name: string;
  createdAt: string;

  constructor(member: Member) {
    this.id = member.id.value;
    this.github = member.githubUsername?.value ?? '';
    this.githubUsername = this.github;
    this.discordId = member.discordId?.value ?? null;
    this.name = member.name.value;
    this.createdAt = member.createdAt.toISOString();
  }
}
