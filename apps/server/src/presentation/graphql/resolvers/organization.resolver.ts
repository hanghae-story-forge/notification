// Organization Domain Resolvers

import { container, ORGANIZATION_REPO_TOKEN } from '@/shared/di';
import type { OrganizationRepository } from '@/domain';
import { GetOrganizationQuery } from '@/application';
import { GqlOrganization } from '../types';
import { domainToGraphqlOrganization } from '../mappers';

// ========================================
// Lazy Dependency Resolution
// ========================================
// Using lazy getters to ensure DI is registered before resolution
// This is needed because modules may be evaluated before registerDependencies() is called

let getOrganizationQuery: GetOrganizationQuery | null = null;
let organizationRepo: OrganizationRepository | null = null;

const getQueries = () => {
  if (!getOrganizationQuery) {
    organizationRepo = container.resolve<OrganizationRepository>(
      ORGANIZATION_REPO_TOKEN
    );
    getOrganizationQuery = new GetOrganizationQuery(organizationRepo);
  }
  return { getOrganizationQuery, organizationRepo };
};

// ========================================
// Resolvers
// ========================================

export const organizationQueries = {
  // 조직 전체 조회
  organizations: async (): Promise<GqlOrganization[]> => {
    const { organizationRepo } = getQueries();
    const orgs = await organizationRepo!.findAll();
    return orgs.map((org) => domainToGraphqlOrganization(org));
  },

  // 활성화된 조직 조회
  activeOrganizations: async (): Promise<GqlOrganization[]> => {
    const { organizationRepo } = getQueries();
    const orgs = await organizationRepo!.findActive();
    return orgs.map((org) => domainToGraphqlOrganization(org));
  },

  // 조직 단건 조회 (slug로)
  organization: async (slug: string): Promise<GqlOrganization | null> => {
    const { getOrganizationQuery } = getQueries();
    const result = await getOrganizationQuery.execute({ slug });
    return result.organization
      ? domainToGraphqlOrganization(result.organization)
      : null;
  },
};

export const organizationMutations = {
  // 향후 조직 생성 기능이 여기에 추가될 수 있습니다
};
