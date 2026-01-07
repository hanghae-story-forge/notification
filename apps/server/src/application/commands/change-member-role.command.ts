// ChangeMemberRoleCommand - 조직원 역할 변경 Command

import { Organization } from '../../domain/organization/organization.domain';
import { Member } from '../../domain/member/member.domain';
import {
  OrganizationMember,
  OrganizationRole,
} from '../../domain/organization-member/organization-member.domain';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';

/**
 * 조직원 역할 변경 요청 데이터
 */
export interface ChangeMemberRoleRequest {
  organizationSlug: string;
  memberDiscordId: string;
  newRole: OrganizationRole;
}

/**
 * 조직원 역할 변경 결과
 */
export interface ChangeMemberRoleResult {
  organizationMember: OrganizationMember;
  organization: Organization;
  member: Member;
}

/**
 * 조직원 역할 변경 Command (Use Case)
 *
 * 책임:
 * 1. 조직 존재 확인
 * 2. 멤버 존재 확인
 * 3. 조직원 존재 확인
 * 4. 역할 변경
 * 5. 저장
 */
export class ChangeMemberRoleCommand {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly memberRepo: MemberRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository
  ) {}

  async execute(
    request: ChangeMemberRoleRequest
  ): Promise<ChangeMemberRoleResult> {
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

    // 3. 조직원 존재 확인
    const organizationMember =
      await this.organizationMemberRepo.findByOrganizationAndMember(
        organization.id,
        member.id
      );

    if (!organizationMember) {
      throw new Error(
        `Member is not part of organization "${request.organizationSlug}"`
      );
    }

    // 4. 역할 변경
    organizationMember.changeRole(request.newRole);

    // 5. 저장
    await this.organizationMemberRepo.save(organizationMember);

    return {
      organizationMember,
      organization,
      member,
    };
  }
}
