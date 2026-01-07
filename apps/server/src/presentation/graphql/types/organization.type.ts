// GraphQL Organization Type

export class GqlOrganization {
  id!: number;
  name!: string;
  slug!: string;
  discordWebhookUrl!: string | null;
  isActive!: boolean;
  createdAt!: string;
}
