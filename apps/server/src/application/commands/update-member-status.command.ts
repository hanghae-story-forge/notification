// UpdateMemberStatusCommand - 멤버 상태 업데이트 Command

import { OrganizationMember, OrganizationMemberStatus } from '../../domain/organization-member/organization-member.domain';
import { OrganizationId } from '../../domain/organization/organization.domain';
import { MemberId } from '../../domain/member/member.domain';
import { OrganizationRepository } from '../../domain/organization/organization.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';

/**
 * 멤버 상태 업데이트 Command 요청 데이터
 */
export interface UpdateMemberStatusRequest {
  organizationId: number;
  memberId: number;
  status: OrganizationMemberStatus;
}

/**
 * 멤버 상태 업데이트 Command 결과
 */
export interface UpdateMemberStatusResult {
  organizationMember: OrganizationMember;
}

/**
 * 멤버 상태 업데이트 Command (Use Case)
 *
 * 책임:
 * 1. 조직원 존재 확인
 * 2. 상태 변경 (승인/거절/비활성화)
 * 3. 저장
 */
export class UpdateMemberStatusCommand {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository
  ) {}

  async execute(request: UpdateMemberStatusRequest): Promise<UpdateMemberStatusResult> {
    // 1. 조직원 존재 확인
    const organizationMember = await this.organizationMemberRepo.findByOrganizationAndMember(
      { value: request.organizationId } as any,
      { value: request.memberId } as any
    );

    if (!organizationMember) {
      throw new Error(
        `Organization member not found: org=${request.organizationId}, member=${request.memberId}`
      );
    }

    // 2. 상태 변경
    switch (request.status) {
      case OrganizationMemberStatus.APPROVED:
        organizationMember.approve();
        break;
      case OrganizationMemberStatus.REJECTED:
        organizationMember.reject();
        break;
      case OrganizationMemberStatus.INACTIVE:
        organizationMember.deactivate();
        break;
      default:
        throw new Error(`Invalid status transition to ${request.status}`);
    }

    // 3. 저장
    await this.organizationMemberRepo.save(organizationMember);

    return {
      organizationMember,
    };
  }
}
