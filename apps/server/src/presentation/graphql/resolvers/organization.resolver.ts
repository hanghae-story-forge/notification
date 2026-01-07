// Organization Domain Resolvers

import { GetOrganizationQuery } from '@/application';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle';
import { GqlOrganization } from '../types';
import { domainToGraphqlOrganization } from '../mappers';

// ========================================
// Repository Instances
// ========================================

const organizationRepo = new DrizzleOrganizationRepository();

// ========================================
// Query Instances
// ========================================

const getOrganizationQuery = new GetOrganizationQuery(organizationRepo);

// ========================================
// Resolvers
// ========================================

export const organizationQueries = {
  // 조직 전체 조회
  organizations: async (): Promise<GqlOrganization[]> => {
    const orgs = await organizationRepo.findAll();
    return orgs.map((org) => domainToGraphqlOrganization(org));
  },

  // 활성화된 조직 조회
  activeOrganizations: async (): Promise<GqlOrganization[]> => {
    const orgs = await organizationRepo.findActive();
    return orgs.map((org) => domainToGraphqlOrganization(org));
  },

  // 조직 단건 조회 (slug로)
  organization: async (slug: string): Promise<GqlOrganization | null> => {
    const result = await getOrganizationQuery.execute({ slug });
    return result.organization
      ? domainToGraphqlOrganization(result.organization)
      : null;
  },
};

export const organizationMutations = {
  // 향후 조직 생성 기능이 여기에 추가될 수 있습니다
};
