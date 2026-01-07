// JoinGenerationCommand - 기수 참여 Command

import { Generation } from '../../domain/generation/generation.domain';
import { Member, MemberId } from '../../domain/member/member.domain';
import { GenerationMember } from '../../domain/generation-member/generation-member.domain';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { GenerationMemberRepository } from '../../domain/generation-member/generation-member.repository';

/**
 * 기수 참여 요청 데이터
 */
export interface JoinGenerationRequest {
  generationId: number;
  memberId: number;
}

/**
 * 기수 참여 결과
 */
export interface JoinGenerationResult {
  generationMember: GenerationMember;
  generation: Generation;
  member: Member;
  isNew: boolean; // 새로 생성된 기수원인지
}

/**
 * 기수 참여 Command (Use Case)
 *
 * 책임:
 * 1. 기수 존재 확인
 * 2. 멤버 존재 확인
 * 3. 해당 기수의 조직 확인
 * 4. **조직원(APPROVED)인지 확인** (핵심 제약)
 * 5. 이미 참여 중인지 확인
 * 6. 기수원 생성
 * 7. 저장
 */
export class JoinGenerationCommand {
  constructor(
    private readonly generationRepo: GenerationRepository,
    private readonly memberRepo: MemberRepository,
    private readonly organizationRepo: OrganizationRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly generationMemberRepo: GenerationMemberRepository
  ) {}

  async execute(request: JoinGenerationRequest): Promise<JoinGenerationResult> {
    // 1. 기수 존재 확인
    const generation = await this.generationRepo.findById(
      GenerationId.create(request.generationId)
    );
    if (!generation) {
      throw new Error(`Generation with ID ${request.generationId} not found`);
    }

    // 2. 멤버 존재 확인
    const member = await this.memberRepo.findById(
      MemberId.create(request.memberId)
    );
    if (!member) {
      throw new Error(`Member with ID ${request.memberId} not found`);
    }

    // 3. 해당 기수의 조직 확인
    const organization = await this.organizationRepo.findById(
      OrganizationId.create(generation.organizationId)
    );
    if (!organization) {
      throw new Error(
        `Organization for generation ${request.generationId} not found`
      );
    }

    // 4. **조직원(APPROVED)인지 확인** (핵심 제약)
    const organizationMember =
      await this.organizationMemberRepo.findByOrganizationAndMember(
        organization.id,
        member.id
      );

    if (!organizationMember) {
      throw new Error(
        `Member must join organization "${organization.slug.value}" first`
      );
    }

    if (!organizationMember.isActiveMember()) {
      throw new Error(
        `Member must be APPROVED in organization "${organization.slug.value}" to join generation`
      );
    }

    // 5. 이미 참여 중인지 확인
    const existing = await this.generationMemberRepo.findByGenerationAndMember(
      generation.id.value,
      member.id.value
    );

    if (existing) {
      // 이미 참여 중이면 현재 상태 반환
      return {
        generationMember: existing,
        generation,
        member,
        isNew: false,
      };
    }

    // 6. 기수원 생성
    const generationMember = GenerationMember.create({
      generationId: generation.id.value,
      memberId: member.id.value,
    });

    // 7. 저장
    await this.generationMemberRepo.save(generationMember);

    return {
      generationMember,
      generation,
      member,
      isNew: true,
    };
  }
}

// Import dependencies
import { GenerationId } from '../../domain/generation/generation.domain';
import { OrganizationId } from '../../domain/organization/organization.domain';
