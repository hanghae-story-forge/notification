// OrganizationMember Mapper

import { OrganizationMember } from '@/domain/organization-member/organization-member.domain';
import { GqlOrganizationMember, GqlMember } from '../types';

export const domainToGraphqlOrganizationMember = (
  organizationMember: OrganizationMember,
  member?: GqlMember
): GqlOrganizationMember => {
  return new GqlOrganizationMember(organizationMember, member);
};
