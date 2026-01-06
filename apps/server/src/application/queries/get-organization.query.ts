// GetOrganizationQuery - 조직 조회 Query

import { Organization } from '../../domain/organization/organization.domain';

/**
 * 조직 조회 Query 요청
 */
export interface GetOrganizationRequest {
  slug: string;
}

/**
 * 조직 조회 Query 결과
 */
export interface GetOrganizationResult {
  organization: Organization | null;
}

/**
 * 조직 조회 Query (Use Case)
 *
 * 책임:
 * 1. Slug로 조직 조회
 */
export class GetOrganizationQuery {
  constructor(private readonly organizationRepo: any) {}

  async execute(request: GetOrganizationRequest): Promise<GetOrganizationResult> {
    const organization = await this.organizationRepo.findBySlug(request.slug);

    return {
      organization,
    };
  }
}
