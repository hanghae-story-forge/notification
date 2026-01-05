// Member Domain Service

import { MemberRepository } from './member.repository';
import { MemberId, Member } from './member.domain';
import { NotFoundError, ValidationError } from '../common/errors';

/**
 * 회원 도메인 서비스
 *
 * 책임:
 * - 회원 조회 관련 비즈니스 로직
 * - 회원 생성/수정 관련 검증 로직
 */
export class MemberService {
  constructor(private readonly memberRepo: MemberRepository) {}

  /**
   * GitHub 사용자명으로 회원을 찾고, 없으면 에러를 발생
   */
  async findMemberByGithubOrThrow(githubUsername: string): Promise<Member> {
    const member = await this.memberRepo.findByGithubUsername(githubUsername);
    if (!member) {
      throw new NotFoundError(
        `Member with GitHub username "${githubUsername}" not found`
      );
    }
    return member;
  }

  /**
   * 회원 ID로 회원을 찾고, 없으면 에러를 발생
   */
  async findMemberByIdOrThrow(id: MemberId): Promise<Member> {
    const member = await this.memberRepo.findById(id);
    if (!member) {
      throw new NotFoundError(`Member with ID ${id.value} not found`);
    }
    return member;
  }

  /**
   * 새 회원 생성 (중복 검사 포함)
   */
  async validateNewMember(githubUsername: string): Promise<void> {
    const existing = await this.memberRepo.findByGithubUsername(githubUsername);
    if (existing) {
      throw new ValidationError(
        `Member with GitHub username "${githubUsername}" already exists`
      );
    }
  }

  /**
   * 여러 GitHub 사용자명으로 회원들을 조회
   */
  async findMembersByGithubUsernames(
    githubUsernames: string[]
  ): Promise<Map<string, Member>> {
    const members = new Map<string, Member>();

    for (const username of githubUsernames) {
      const member = await this.memberRepo.findByGithubUsername(username);
      if (member) {
        members.set(username, member);
      }
    }

    return members;
  }

  /**
   * 제출하지 않은 회원들을 조회
   */
  async findMembersNotInSet(memberIds: Set<number>): Promise<Member[]> {
    const allMembers = await this.memberRepo.findAll();
    return allMembers.filter((member) => !memberIds.has(member.id.value));
  }
}
