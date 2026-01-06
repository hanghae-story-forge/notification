// GetOrganizationMembersQuery - 조직 멤버 조회 Query

import { OrganizationMember } from '../../domain/organization-member/organization-member.domain';
import { OrganizationMemberStatus } from '../../domain/organization-member/organization-member.vo';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';
import { MemberRepository } from '../../domain/member/member.repository';

/**
 * 조직 멤버 조회 Query 요청
 */
export interface GetOrganizationMembersRequest {
  organizationSlug: string;
  status?: OrganizationMemberStatus; // 선택적 상태 필터
}

/**
 * 조직 멤버 DTO (결과)
 */
export interface OrganizationMemberDTO {
  id: number;
  memberId: number;
  memberName: string;
  memberDiscordId: string;
  role: string;
  status: OrganizationMemberStatus;
  joinedAt: string;
}

/**
 * 조직 멤버 조회 Query 결과
 */
export interface GetOrganizationMembersResult {
  members: OrganizationMemberDTO[];
}

/**
 * 조직 멤버 조회 Query (Use Case)
 *
 * 책임:
 * 1. 조직 존재 확인
 * 2. 조직원 목록 조회 (상태 필터 지원)
 * 3. 멤버 정보 조인
 */
export class GetOrganizationMembersQuery {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly memberRepo: MemberRepository
  ) {}

  async execute(
    request: GetOrganizationMembersRequest
  ): Promise<GetOrganizationMembersResult> {
    // 1. 조직 존재 확인
    const organization = await this.organizationRepo.findBySlug(
      request.organizationSlug
    );
    if (!organization) {
      throw new Error(`Organization "${request.organizationSlug}" not found`);
    }

    // 2. 조직원 목록 조회
    let organizationMembers: OrganizationMember[];
    if (request.status) {
      // 상태 필터가 있는 경우
      switch (request.status) {
        case OrganizationMemberStatus.APPROVED:
          organizationMembers =
            await this.organizationMemberRepo.findActiveByOrganization(
              organization.id
            );
          break;
        case OrganizationMemberStatus.PENDING:
          organizationMembers =
            await this.organizationMemberRepo.findPendingByOrganization(
              organization.id
            );
          break;
        default:
          organizationMembers =
            await this.organizationMemberRepo.findByOrganization(
              organization.id
            );
      }
    } else {
      // 모든 멤버
      organizationMembers =
        await this.organizationMemberRepo.findByOrganization(organization.id);
    }

    // 3. 멤버 정보 조인
    const membersDTO: OrganizationMemberDTO[] = [];
    for (const orgMember of organizationMembers) {
      const member = await this.memberRepo.findById(orgMember.memberId);
      if (member) {
        membersDTO.push({
          id: orgMember.id.value,
          memberId: member.id.value,
          memberName: member.name.value,
          memberDiscordId: member.discordId.value,
          role: orgMember.role.value,
          status: orgMember.status.value,
          joinedAt: orgMember.joinedAt.toISOString(),
        });
      }
    }

    return {
      members: membersDTO,
    };
  }
}
