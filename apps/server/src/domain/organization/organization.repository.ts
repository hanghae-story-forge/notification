// Organization Repository Interface

import { Organization, OrganizationId } from './organization.domain';

export interface OrganizationRepository {
  // 조직 저장 (생성 또는 업데이트)
  save(organization: Organization): Promise<void>;

  // ID로 조회
  findById(id: OrganizationId): Promise<Organization | null>;

  // Slug로 조회
  findBySlug(slug: string): Promise<Organization | null>;

  // 모든 조직 조회
  findAll(): Promise<Organization[]>;

  // 활성화된 조직만 조회
  findActive(): Promise<Organization[]>;

  // Slug 중복 확인
  existsBySlug(slug: string): Promise<boolean>;

  // 조직 삭제 (soft delete - 비활성화)
  delete(id: OrganizationId): Promise<void>;
}
