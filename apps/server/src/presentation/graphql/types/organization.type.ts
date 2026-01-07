// GraphQL Organization Type

import { GqlOrganizationMember } from './organization-member.type';

export class GqlOrganization {
  id!: number;
  name!: string;
  slug!: string;
  discordWebhookUrl!: string | null;
  isActive!: boolean;
  createdAt!: string;
  members?: GqlOrganizationMember[];
}
