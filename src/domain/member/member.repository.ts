// Member Repository Interface

import { MemberId, Member } from './member.domain';

export interface MemberRepository {
  findById(id: MemberId): Promise<Member | null>;
  findByGithubUsername(githubUsername: string): Promise<Member | null>;
  findAll(): Promise<Member[]>;
  save(member: Member): Promise<void>;
}
