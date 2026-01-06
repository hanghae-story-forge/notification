// JoinOrganizationCommand - 조직 가입 요청 Command

import { Organization } from '../../domain/organization/organization.domain';
import { Member } from '../../domain/member/member.domain';
import {
  OrganizationMember,
  OrganizationMemberStatus,
  OrganizationRole,
} from '../../domain/organization-member/organization-member.domain';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';

/**
 * 조직 가입 요청 데이터
 */
export interface JoinOrganizationRequest {
  organizationSlug: string;
  memberDiscordId: string;
}

/**
 * 조직 가입 결과
 */
export interface JoinOrganizationResult {
  organizationMember: OrganizationMember;
  organization: Organization;
  member: Member;
  isNew: boolean; // 새로 생성된 조직원인지
}

/**
 * 조직 가입 요청 Command (Use Case)
 *
 * 책임:
 * 1. 조직 존재 확인
 * 2. 멤버 존재 확인 (없으면 에러)
 * 3. 이미 속해 있는지 확인
 * 4. PENDING 상태로 조직원 생성
 * 5. 저장
 */
export class JoinOrganizationCommand {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly memberRepo: MemberRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository
  ) {}

  async execute(
    request: JoinOrganizationRequest
  ): Promise<JoinOrganizationResult> {
    // 1. 조직 존재 확인
    const organization = await this.organizationRepo.findBySlug(
      request.organizationSlug
    );
    if (!organization) {
      throw new Error(`Organization "${request.organizationSlug}" not found`);
    }

    // 2. 멤버 존재 확인
    const member = await this.memberRepo.findByDiscordId(
      request.memberDiscordId
    );
    if (!member) {
      throw new Error(
        `Member with Discord ID ${request.memberDiscordId} not found`
      );
    }

    // 3. 이미 속해 있는지 확인
    const existing =
      await this.organizationMemberRepo.findByOrganizationAndMember(
        organization.id,
        member.id
      );

    if (existing) {
      // 이미 속해 있으면 현재 상태 반환
      return {
        organizationMember: existing,
        organization,
        member,
        isNew: false,
      };
    }

    // 4. 조직원 생성 (PENDING 상태)
    const organizationMember = OrganizationMember.create({
      organizationId: organization.id.value,
      memberId: member.id.value,
      role: OrganizationRole.MEMBER,
      status: OrganizationMemberStatus.PENDING,
    });

    // 5. 저장
    await this.organizationMemberRepo.save(organizationMember);

    return {
      organizationMember,
      organization,
      member,
      isNew: true,
    };
  }
}
