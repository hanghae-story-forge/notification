// GetMemberOrganizationsQuery - 멤버가 속한 조직 목록 조회 Query

import { OrganizationMemberStatus } from '../../domain/organization-member/organization-member.vo';
import { MemberRepository } from '../../domain/member/member.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';
import { OrganizationRepository } from '../../domain/organization/organization.repository';

/**
 * 멤버의 조직 목록 조회 요청
 */
export interface GetMemberOrganizationsRequest {
  memberDiscordId: string;
  activeOnly?: boolean; // 활성 멤버만 조회할지
}

/**
 * 멤버의 조직 정보
 */
export interface MemberOrganizationDTO {
  id: number;
  name: string;
  slug: string;
  role: string;
  status: OrganizationMemberStatus;
  joinedAt: string;
}

/**
 * 멤버의 조직 목록 조회 결과
 */
export interface GetMemberOrganizationsResult {
  organizations: MemberOrganizationDTO[];
}

/**
 * 멤버의 조직 목록 조회 Query (Use Case)
 *
 * 책임:
 * 1. 멤버 존재 확인
 * 2. 멤버의 조직원 목록 조회
 * 3. 조직 정보 조인
 */
export class GetMemberOrganizationsQuery {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(
    request: GetMemberOrganizationsRequest
  ): Promise<GetMemberOrganizationsResult> {
    // 1. 멤버 존재 확인
    const member = await this.memberRepo.findByDiscordId(
      request.memberDiscordId
    );
    if (!member) {
      throw new Error(
        `Member with Discord ID ${request.memberDiscordId} not found`
      );
    }

    // 2. 멤버의 조직원 목록 조회
    const organizationMembers = await this.organizationMemberRepo.findByMember(
      member.id
    );

    // 3. 조직 정보 조인 및 필터링
    const organizationsDTO: MemberOrganizationDTO[] = [];
    for (const orgMember of organizationMembers) {
      // 활성 멤버만 필터링
      if (request.activeOnly && !orgMember.isActiveMember()) {
        continue;
      }

      const organization = await this.organizationRepo.findById(
        orgMember.organizationId
      );
      if (organization) {
        organizationsDTO.push({
          id: organization.id.value,
          name: organization.name.value,
          slug: organization.slug.value,
          role: orgMember.role.value,
          status: orgMember.status.value,
          joinedAt: orgMember.joinedAt.toISOString(),
        });
      }
    }

    return {
      organizations: organizationsDTO,
    };
  }
}
