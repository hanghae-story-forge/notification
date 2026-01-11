// GenerationMember Repository Interface

import {
  GenerationMember,
  GenerationMemberId,
} from './generation-member.domain';
import { MemberId } from '../member/member.domain';

export interface GenerationMemberRepository {
  /**
   * 기수원 저장 (생성)
   */
  save(generationMember: GenerationMember): Promise<void>;

  /**
   * ID로 기수원 조회
   */
  findById(id: GenerationMemberId): Promise<GenerationMember | null>;

  /**
   * 기수와 멤버로 기수원 조회 (중복 체크용)
   */
  findByGenerationAndMember(
    generationId: number,
    memberId: number
  ): Promise<GenerationMember | null>;

  /**
   * 기수별 모든 기수원 조회
   */
  findByGeneration(generationId: number): Promise<GenerationMember[]>;

  /**
   * 멤버가 속한 모든 기수 조회
   */
  findByMember(memberId: MemberId): Promise<GenerationMember[]>;

  /**
   * 멤버가 속한 모든 기수를 기수 및 조직 정보와 함께 조회 (N+1 해결)
   */
  findByMemberWithGenerations(memberId: MemberId): Promise<
    Array<{
      generationMember: GenerationMember;
      generation: {
        id: number;
        name: string;
        organizationId: number;
        startedAt: Date;
        isActive: boolean;
      } | null;
      organization: { id: number; name: string } | null;
    }>
  >;

  /**
   * 기수원 삭제
   */
  delete(generationMember: GenerationMember): Promise<void>;
}
