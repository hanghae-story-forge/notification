// CreateOrganizationCommand - 조직 생성 Command

import { Organization } from '../../domain/organization/organization.domain';
import { OrganizationRepository } from '../../domain/organization/organization.repository';

/**
 * 조직 생성 Command 요청 데이터
 */
export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  discordWebhookUrl?: string;
}

/**
 * 조직 생성 Command 결과
 */
export interface CreateOrganizationResult {
  organization: Organization;
}

/**
 * 조직 생성 Command (Use Case)
 *
 * 책임:
 * 1. Slug 중복 검사
 * 2. 조직 생성
 * 3. 조직 저장
 */
export class CreateOrganizationCommand {
  constructor(private readonly organizationRepo: OrganizationRepository) {}

  async execute(
    request: CreateOrganizationRequest
  ): Promise<CreateOrganizationResult> {
    // 1. Slug 중복 검사
    const slug = request.slug ?? request.name;
    const existingOrg = await this.organizationRepo.findBySlug(slug);
    if (existingOrg) {
      throw new Error(`Organization with slug "${slug}" already exists`);
    }

    // 2. 조직 생성 (자동으로 slug 생성됨)
    const organization = Organization.create({
      name: request.name,
      slug: request.slug,
      discordWebhookUrl: request.discordWebhookUrl,
      isActive: true,
    });

    // 3. 저장
    await this.organizationRepo.save(organization);

    return {
      organization,
    };
  }
}
