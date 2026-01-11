// OrganizationMember Repository Interface

import {
  OrganizationMember,
  OrganizationMemberId,
} from './organization-member.domain';
import { OrganizationId } from '../organization/organization.domain';
import { MemberId } from '../member/member.domain';
import { OrganizationRole } from './organization-member.vo';

export interface OrganizationMemberRepository {
  // 조직원 저장 (생성 또는 업데이트)
  save(organizationMember: OrganizationMember): Promise<void>;

  // ID로 조회
  findById(id: OrganizationMemberId): Promise<OrganizationMember | null>;

  // 조직 + 멤버로 조회
  findByOrganizationAndMember(
    organizationId: OrganizationId,
    memberId: MemberId
  ): Promise<OrganizationMember | null>;

  // 조직의 모든 멤버 조회
  findByOrganization(
    organizationId: OrganizationId
  ): Promise<OrganizationMember[]>;

  // 조직의 활성 멤버만 조회
  findActiveByOrganization(
    organizationId: OrganizationId
  ): Promise<OrganizationMember[]>;

  // 조직의 대기중인 멤버 조회
  findPendingByOrganization(
    organizationId: OrganizationId
  ): Promise<OrganizationMember[]>;

  // 조직의 특정 역할을 가진 멤버 조회
  findByOrganizationAndRole(
    organizationId: OrganizationId,
    role: OrganizationRole
  ): Promise<OrganizationMember[]>;

  // 멤버가 속한 모든 조직 조회
  findByMember(memberId: MemberId): Promise<OrganizationMember[]>;

  // 멤버가 특정 조직에 활성 상태로 속해 있는지 확인
  isActiveMember(
    organizationId: OrganizationId,
    memberId: MemberId
  ): Promise<boolean>;

  // 조직에서 멤버 제거 (soft delete - status를 INACTIVE로 변경)
  remove(organizationId: OrganizationId, memberId: MemberId): Promise<void>;

  // 조직의 멤버 수 조회
  countByOrganization(organizationId: OrganizationId): Promise<number>;

  // 조직의 활성 멤버 수 조회
  countActiveByOrganization(organizationId: OrganizationId): Promise<number>;

  // 멤버가 속한 모든 조직을 조직 정보와 함께 조회 (N+1 해결)
  findByMemberWithOrganizations(memberId: MemberId): Promise<
    Array<{
      organizationMember: OrganizationMember;
      organization: { id: number; name: string } | null;
    }>
  >;
}
