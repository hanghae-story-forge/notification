// GetAllMembersQuery - 전체 회원 조회 Query

import { MemberRepository } from '../../domain/member/member.repository';
import { Member } from '../../domain/member/member.domain';

/**
 * 전체 회원 조회 Query (Use Case)
 *
 * 책임:
 * 1. 전체 회원 목록 조회
 */
export class GetAllMembersQuery {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(): Promise<Member[]> {
    return await this.memberRepo.findAll();
  }
}
