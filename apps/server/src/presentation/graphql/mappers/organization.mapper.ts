// Organization Mapper

import { Organization } from '@/domain/organization/organization.domain';
import { GqlOrganization, GqlOrganizationMember } from '../types';

export const domainToGraphqlOrganization = (
  organization: Organization,
  members?: GqlOrganizationMember[]
): GqlOrganization => {
  const dto = organization.toDTO();
  const gqlOrg = new GqlOrganization();
  gqlOrg.id = dto.id;
  gqlOrg.name = dto.name;
  gqlOrg.slug = dto.slug;
  gqlOrg.discordWebhookUrl = dto.discordWebhookUrl;
  gqlOrg.isActive = dto.isActive;
  gqlOrg.createdAt = dto.createdAt;
  gqlOrg.members = members;
  return gqlOrg;
};
