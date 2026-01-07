// GraphQL OrganizationMember Type

import { OrganizationMember } from '@/domain/organization-member/organization-member.domain';
import { GqlMember } from './member.type';

export class GqlOrganizationMember {
  id: number;
  organizationId: number;
  role: string;
  status: string;
  joinedAt: string;
  updatedAt: string;
  member?: GqlMember;

  constructor(orgMember: OrganizationMember, member?: GqlMember) {
    this.id = orgMember.id.value;
    this.organizationId = orgMember.organizationId.value;
    this.role = orgMember.role.value;
    this.status = orgMember.status.value;
    this.joinedAt = orgMember.joinedAt.toISOString();
    this.updatedAt = orgMember.updatedAt.toISOString();
    this.member = member;
  }
}
