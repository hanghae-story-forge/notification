// AddMemberToOrganizationCommand - 조직에 멤버 추가 Command

import { Organization } from '../../domain/organization/organization.domain';
import { Member, MemberId } from '../../domain/member/member.domain';
import {
  OrganizationMember,
  OrganizationRole,
  OrganizationMemberStatus,
} from '../../domain/organization-member/organization-member.domain';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';

/**
 * 조직에 멤버 추가 Command 요청 데이터
 */
export interface AddMemberToOrganizationRequest {
  organizationSlug: string;
  memberId: number;
  role?: OrganizationRole; // 기본값: MEMBER
}

/**
 * 조직에 멤버 추가 Command 결과
 */
export interface AddMemberToOrganizationResult {
  organizationMember: OrganizationMember;
  organization: Organization;
  member: Member;
}

/**
 * 조직에 멤버 추가 Command (Use Case)
 *
 * 책임:
 * 1. 조직 존재 확인
 * 2. 멤버 존재 확인
 * 3. 이미 속해 있는지 확인
 * 4. 조직원 생성 (PENDING 상태)
 * 5. 저장
 */
export class AddMemberToOrganizationCommand {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly memberRepo: MemberRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository
  ) {}

  async execute(
    request: AddMemberToOrganizationRequest
  ): Promise<AddMemberToOrganizationResult> {
    // 1. 조직 존재 확인
    const organization = await this.organizationRepo.findBySlug(
      request.organizationSlug
    );
    if (!organization) {
      throw new Error(`Organization "${request.organizationSlug}" not found`);
    }

    // 2. 멤버 존재 확인
    const member = await this.memberRepo.findById(
      MemberId.create(request.memberId)
    );
    if (!member) {
      throw new Error(`Member with ID ${request.memberId} not found`);
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
      };
    }

    // 4. 조직원 생성 (기본 PENDING 상태)
    const organizationMember = OrganizationMember.create({
      organizationId: organization.id.value,
      memberId: member.id.value,
      role: request.role ?? OrganizationRole.MEMBER,
      status: OrganizationMemberStatus.PENDING,
    });

    // 5. 저장
    await this.organizationMemberRepo.save(organizationMember);

    return {
      organizationMember,
      organization,
      member,
    };
  }
}
