// Member Repository Interface

import { MemberId, Member } from './member.domain';

export interface MemberRepository {
  /**
   * 회원 저장 (생성 또는 업데이트)
   */
  save(member: Member): Promise<void>;

  /**
   * ID로 회원 조회
   */
  findById(id: MemberId): Promise<Member | null>;

  /**
   * GitHub 사용자명으로 회원 조회
   */
  findByGithubUsername(githubUsername: string): Promise<Member | null>;

  /**
   * 전체 회원 조회
   */
  findAll(): Promise<Member[]>;

  /**
   * Discord ID로 회원 조회
   */
  findByDiscordId(discordId: string): Promise<Member | null>;
}
