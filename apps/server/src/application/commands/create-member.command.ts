// CreateMemberCommand - 회원 생성 Command

import { Member } from '../../domain/member/member.domain';
import { MemberRepository } from '../../domain/member/member.repository';
import { MemberService } from '../../domain/member/member.service';

/**
 * 회원 생성 Command 요청 데이터
 */
export interface CreateMemberRequest {
  githubUsername: string;
  name: string;
  discordId?: string;
}

/**
 * 회원 생성 Command 결과
 */
export interface CreateMemberResult {
  member: Member;
}

/**
 * 회원 생성 Command (Use Case)
 *
 * 책임:
 * 1. 중복 회원 검사
 * 2. 회원 생성
 * 3. 회원 저장
 */
export class CreateMemberCommand {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly memberService: MemberService
  ) {}

  async execute(request: CreateMemberRequest): Promise<CreateMemberResult> {
    // 1. 중복 회원 검사
    await this.memberService.validateNewMember(request.githubUsername);

    // 2. 회원 생성
    const member = Member.create({
      githubUsername: request.githubUsername,
      name: request.name,
      discordId: request.discordId,
    });

    // 3. 저장
    await this.memberRepo.save(member);

    return {
      member,
    };
  }
}
