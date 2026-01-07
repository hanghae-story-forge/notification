// OrganizationMember Domain Resolvers

import { GetOrganizationMembersQuery } from '@/application';
import { ChangeMemberRoleCommand } from '@/application';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle';
import { GqlOrganizationMember } from '../types';
import {
  OrganizationMemberStatus,
  OrganizationRole,
} from '@/domain/organization-member/organization-member.vo';
import { OrganizationMember } from '@/domain/organization-member/organization-member.domain';
import { Member } from '@/domain/member/member.domain';
import type { OrganizationMemberDTO } from '@/application/queries/get-organization-members.query';

// ========================================
// Repository Instances
// ========================================

const organizationMemberRepo = new DrizzleOrganizationMemberRepository();
const organizationRepo = new DrizzleOrganizationRepository();
const memberRepo = new DrizzleMemberRepository();

// ========================================
// Query & Command Instances
// ========================================

const getOrganizationMembersQuery = new GetOrganizationMembersQuery(
  organizationRepo,
  organizationMemberRepo,
  memberRepo
);

const changeMemberRoleCommand = new ChangeMemberRoleCommand(
  organizationRepo,
  memberRepo,
  organizationMemberRepo
);

// ========================================
// Helper Functions
// ========================================

// DTO를 GraphQL 타입으로 변환하는 헬퍼 함수
function mapToGqlOrganizationMember(
  memberDTO: OrganizationMemberDTO
): GqlOrganizationMember {
  // OrganizationMember 도메인 객체 생성
  const organizationMember = OrganizationMember.reconstitute({
    id: memberDTO.id,
    organizationId: 0, // Not needed for this response
    memberId: memberDTO.memberId,
    role: memberDTO.role,
    status: memberDTO.status,
    joinedAt: new Date(memberDTO.joinedAt),
    updatedAt: new Date(),
  });

  // Member 도메인 객체 생성
  const member = Member.reconstitute({
    id: memberDTO.memberId,
    discordId: memberDTO.memberDiscordId,
    name: memberDTO.memberName,
    createdAt: new Date(),
  });

  return new GqlOrganizationMember(organizationMember, {
    id: member.id.value,
    github: member.githubUsername?.value ?? '',
    discordId: member.discordId.value,
    name: member.name.value,
    createdAt: member.createdAt.toISOString(),
  });
}

// ========================================
// Resolvers
// ========================================

export const organizationMemberQueries = {
  // 조직의 가입 신청 중(PENDING)인 멤버 목록 조회
  pendingOrganizationMembers: async (
    organizationSlug: string
  ): Promise<GqlOrganizationMember[]> => {
    const result = await getOrganizationMembersQuery.execute({
      organizationSlug,
      status: OrganizationMemberStatus.PENDING,
    });

    return result.members.map(mapToGqlOrganizationMember);
  },

  // 조직의 전체 멤버 목록 조회 (상태 필터 지원)
  organizationMembers: async (
    organizationSlug: string,
    status?: string
  ): Promise<GqlOrganizationMember[]> => {
    const result = await getOrganizationMembersQuery.execute({
      organizationSlug,
      status: status as OrganizationMemberStatus,
    });

    return result.members.map(mapToGqlOrganizationMember);
  },
};

export const organizationMemberMutations = {
  // 조직원 역할 변경
  changeMemberRole: async (
    organizationSlug: string,
    memberDiscordId: string,
    newRole: string
  ): Promise<GqlOrganizationMember> => {
    const result = await changeMemberRoleCommand.execute({
      organizationSlug,
      memberDiscordId,
      newRole: newRole.toUpperCase() as OrganizationRole,
    });

    // Member 도메인 객체 생성
    const member = Member.reconstitute({
      id: result.member.id.value,
      discordId: result.member.discordId.value,
      name: result.member.name.value,
      createdAt: result.member.createdAt,
    });

    return new GqlOrganizationMember(result.organizationMember, {
      id: member.id.value,
      github: member.githubUsername?.value ?? '',
      discordId: member.discordId.value,
      name: member.name.value,
      createdAt: member.createdAt.toISOString(),
    });
  },
};
