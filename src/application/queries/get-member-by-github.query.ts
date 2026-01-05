// GetMemberByGithubQuery - GitHub username으로 회원 조회 Query

import { MemberRepository } from '../../domain/member/member.repository';
import { Member } from '../../domain/member/member.domain';

/**
 * GitHub username으로 회원 조회 Query (Use Case)
 *
 * 책임:
 * 1. GitHub username으로 회원 조회
 */
export class GetMemberByGithubQuery {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(githubUsername: string): Promise<Member | null> {
    const member = await this.memberRepo.findByGithubUsername(githubUsername);
    return member;
  }
}
