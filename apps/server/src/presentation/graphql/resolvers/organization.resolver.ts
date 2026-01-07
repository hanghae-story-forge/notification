// Organization Domain Resolvers

import { GetOrganizationQuery } from '@/application';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle';
import { GqlOrganization, GqlOrganizationMember } from '../types';
import { domainToGraphqlOrganization } from '../mappers';
import { OrganizationMember } from '@/domain/organization-member/organization-member.domain';
import { Member } from '@/domain/member/member.domain';

// ========================================
// Repository Instances
// ========================================

const organizationRepo = new DrizzleOrganizationRepository();
const organizationMemberRepo = new DrizzleOrganizationMemberRepository();
const memberRepo = new DrizzleMemberRepository();

// ========================================
// Query Instances
// ========================================

const getOrganizationQuery = new GetOrganizationQuery(organizationRepo);

// ========================================
// Resolvers
// ========================================

// Helper 함수: OrganizationMember를 GqlOrganizationMember로 변환
async function mapToGqlOrganizationMember(
  organizationMember: OrganizationMember
): Promise<GqlOrganizationMember> {
  const member = await memberRepo.findById(organizationMember.memberId);
  if (!member) {
    throw new Error(`Member ${organizationMember.memberId.value} not found`);
  }

  return new GqlOrganizationMember(organizationMember, {
    id: member.id.value,
    github: member.githubUsername?.value ?? '',
    discordId: member.discordId.value,
    name: member.name.value,
    createdAt: member.createdAt.toISOString(),
  });
}

export const organizationQueries = {
  // 조직 전체 조회
  organizations: async (): Promise<GqlOrganization[]> => {
    const orgs = await organizationRepo.findAll();
    const results = await Promise.all(
      orgs.map(async (org) => {
        const organizationMembers =
          await organizationMemberRepo.findByOrganization(org.id);
        const members = await Promise.all(
          organizationMembers.map(mapToGqlOrganizationMember)
        );
        return domainToGraphqlOrganization(org, members);
      })
    );
    return results;
  },

  // 활성화된 조직 조회
  activeOrganizations: async (): Promise<GqlOrganization[]> => {
    const orgs = await organizationRepo.findActive();
    const results = await Promise.all(
      orgs.map(async (org) => {
        const organizationMembers =
          await organizationMemberRepo.findByOrganization(org.id);
        const members = await Promise.all(
          organizationMembers.map(mapToGqlOrganizationMember)
        );
        return domainToGraphqlOrganization(org, members);
      })
    );
    return results;
  },

  // 조직 단건 조회 (slug로)
  organization: async (slug: string): Promise<GqlOrganization | null> => {
    const result = await getOrganizationQuery.execute({ slug });
    if (!result.organization) return null;

    const organizationMembers =
      await organizationMemberRepo.findByOrganization(result.organization.id);
    const members = await Promise.all(
      organizationMembers.map(mapToGqlOrganizationMember)
    );

    return domainToGraphqlOrganization(result.organization, members);
  },
};

export const organizationMutations = {
  // 향후 조직 생성 기능이 여기에 추가될 수 있습니다
};
