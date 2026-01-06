// Organization Repository Implementation - Drizzle ORM

import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db';
import { organizations } from '../drizzle-db/schema';
import {
  Organization,
  OrganizationId,
} from '../../../domain/organization/organization.domain';
import { OrganizationSlug } from '../../../domain/organization/organization.vo';
import { OrganizationRepository } from '../../../domain/organization/organization.repository';

export class DrizzleOrganizationRepository implements OrganizationRepository {
  async save(organization: Organization): Promise<void> {
    const dto = organization.toDTO();

    // ID가 0이면 새로운 조직 (생성)
    if (dto.id === 0) {
      await db.insert(organizations).values({
        name: dto.name,
        slug: dto.slug,
        discordWebhookUrl: dto.discordWebhookUrl,
        isActive: dto.isActive,
      });
    } else {
      // 기존 조직 업데이트
      await db
        .update(organizations)
        .set({
          name: dto.name,
          slug: dto.slug,
          discordWebhookUrl: dto.discordWebhookUrl,
          isActive: dto.isActive,
        })
        .where(eq(organizations.id, dto.id));
    }
  }

  async findById(id: OrganizationId): Promise<Organization | null> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findAll(): Promise<Organization[]> {
    const result = await db.select().from(organizations);
    return result.map((row) => this.mapToEntity(row));
  }

  async findActive(): Promise<Organization[]> {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.isActive, true));
    return result.map((row) => this.mapToEntity(row));
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const result = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    return result.length > 0;
  }

  async delete(id: OrganizationId): Promise<void> {
    // Soft delete - 비활성화
    await db
      .update(organizations)
      .set({ isActive: false })
      .where(eq(organizations.id, id.value));
  }

  private mapToEntity(row: {
    id: number;
    name: string;
    slug: string;
    discordWebhookUrl: string | null;
    isActive: boolean;
    createdAt: Date;
  }): Organization {
    return Organization.reconstitute({
      id: row.id,
      name: row.name,
      slug: row.slug,
      discordWebhookUrl: row.discordWebhookUrl,
      isActive: row.isActive,
      createdAt: row.createdAt,
    });
  }
}
