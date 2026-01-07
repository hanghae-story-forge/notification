// Organization Domain Resolvers

import {
  container,
  MEMBER_REPO_TOKEN,
  ORGANIZATION_MEMBER_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
} from '@/shared/di';
import type {
  MemberRepository,
  OrganizationMemberRepository,
  OrganizationRepository,
} from '@/domain';
import { GetOrganizationQuery } from '@/application';
import { GqlOrganization, GqlOrganizationMember } from '../types';
import { domainToGraphqlOrganization } from '../mappers';
import { OrganizationMember } from '@/domain/organization-member/organization-member.domain';

// ========================================
// Lazy Dependency Resolution
// ========================================
// Using lazy getters to ensure DI is registered before resolution
// This is needed because modules may be evaluated before registerDependencies() is called

let getOrganizationQuery: GetOrganizationQuery | null = null;
let organizationRepo: OrganizationRepository | null = null;
let organizationMemberRepo: OrganizationMemberRepository | null = null;
let memberRepo: MemberRepository | null = null;

const getQueries = () => {
  if (!getOrganizationQuery) {
    organizationRepo = container.resolve<OrganizationRepository>(
      ORGANIZATION_REPO_TOKEN
    );
    organizationMemberRepo = container.resolve<OrganizationMemberRepository>(
      ORGANIZATION_MEMBER_REPO_TOKEN
    );
    memberRepo = container.resolve<MemberRepository>(MEMBER_REPO_TOKEN);
    getOrganizationQuery = new GetOrganizationQuery(organizationRepo);
  }
  return {
    getOrganizationQuery,
    organizationRepo: organizationRepo!,
    organizationMemberRepo: organizationMemberRepo!,
    memberRepo: memberRepo!,
  };
};

// ========================================
// Resolvers
// ========================================

// Helper 함수: OrganizationMember를 GqlOrganizationMember로 변환
async function mapToGqlOrganizationMember(
  organizationMember: OrganizationMember,
  memberRepo: MemberRepository
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

async function loadOrganizationMembers(
  organizationMemberRepo: OrganizationMemberRepository,
  memberRepo: MemberRepository,
  organizationId: Parameters<OrganizationMemberRepository['findByOrganization']>[0]
): Promise<GqlOrganizationMember[]> {
  const organizationMembers =
    await organizationMemberRepo.findByOrganization(organizationId);
  return Promise.all(
    organizationMembers.map((organizationMember) =>
      mapToGqlOrganizationMember(organizationMember, memberRepo)
    )
  );
}

export const organizationQueries = {
  // 조직 전체 조회
  organizations: async (): Promise<GqlOrganization[]> => {
    const { organizationRepo, organizationMemberRepo, memberRepo } =
      getQueries();
    const orgs = await organizationRepo.findAll();
    return Promise.all(
      orgs.map(async (org) => {
        const members = await loadOrganizationMembers(
          organizationMemberRepo,
          memberRepo,
          org.id
        );
        return domainToGraphqlOrganization(org, members);
      })
    );
  },

  // 활성화된 조직 조회
  activeOrganizations: async (): Promise<GqlOrganization[]> => {
    const { organizationRepo, organizationMemberRepo, memberRepo } =
      getQueries();
    const orgs = await organizationRepo.findActive();
    return Promise.all(
      orgs.map(async (org) => {
        const members = await loadOrganizationMembers(
          organizationMemberRepo,
          memberRepo,
          org.id
        );
        return domainToGraphqlOrganization(org, members);
      })
    );
  },

  // 조직 단건 조회 (slug로)
  organization: async (slug: string): Promise<GqlOrganization | null> => {
    const { getOrganizationQuery, organizationMemberRepo, memberRepo } =
      getQueries();
    const result = await getOrganizationQuery.execute({ slug });
    if (!result.organization) return null;

    const members = await loadOrganizationMembers(
      organizationMemberRepo,
      memberRepo,
      result.organization.id
    );

    return domainToGraphqlOrganization(result.organization, members);
  },
};

export const organizationMutations = {
  // 향후 조직 생성 기능이 여기에 추가될 수 있습니다
};
