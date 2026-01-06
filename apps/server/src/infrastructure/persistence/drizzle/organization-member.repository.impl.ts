// OrganizationMember Repository Implementation - Drizzle ORM

import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import { organizationMembers } from '../drizzle-db/schema';
import { OrganizationMember, OrganizationMemberId } from '../../../domain/organization-member/organization-member.domain';
import { OrganizationId } from '../../../domain/organization/organization.domain';
import { MemberId } from '../../../domain/member/member.domain';
import { OrganizationMemberRepository } from '../../../domain/organization-member/organization-member.repository';
import { OrganizationMemberStatus, OrganizationRole } from '../../../domain/organization-member/organization-member.vo';

export class DrizzleOrganizationMemberRepository implements OrganizationMemberRepository {
  async save(organizationMember: OrganizationMember): Promise<void> {
    const dto = organizationMember.toDTO();

    // ID가 0이면 새로운 조직원 (생성)
    if (dto.id === 0) {
      await db.insert(organizationMembers).values({
        organizationId: dto.organizationId,
        memberId: dto.memberId,
        role: dto.role,
        status: dto.status,
        joinedAt: new Date(dto.joinedAt),
        updatedAt: new Date(dto.updatedAt),
      });
    } else {
      // 기존 조직원 업데이트
      await db
        .update(organizationMembers)
        .set({
          organizationId: dto.organizationId,
          memberId: dto.memberId,
          role: dto.role,
          status: dto.status,
          joinedAt: new Date(dto.joinedAt),
          updatedAt: new Date(dto.updatedAt),
        })
        .where(eq(organizationMembers.id, dto.id));
    }
  }

  async findById(id: OrganizationMemberId): Promise<OrganizationMember | null> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByOrganizationAndMember(
    organizationId: OrganizationId,
    memberId: MemberId
  ): Promise<OrganizationMember | null> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.memberId, memberId.value)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId.value));

    return result.map((row) => this.mapToEntity(row));
  }

  async findActiveByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.status, OrganizationMemberStatus.APPROVED)
        )
      );

    return result.map((row) => this.mapToEntity(row));
  }

  async findPendingByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.status, OrganizationMemberStatus.PENDING)
        )
      );

    return result.map((row) => this.mapToEntity(row));
  }

  async findByOrganizationAndRole(
    organizationId: OrganizationId,
    role: OrganizationRole
  ): Promise<OrganizationMember[]> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.role, role)
        )
      );

    return result.map((row) => this.mapToEntity(row));
  }

  async findByMember(memberId: MemberId): Promise<OrganizationMember[]> {
    const result = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.memberId, memberId.value));

    return result.map((row) => this.mapToEntity(row));
  }

  async isActiveMember(organizationId: OrganizationId, memberId: MemberId): Promise<boolean> {
    const result = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.memberId, memberId.value),
          eq(organizationMembers.status, OrganizationMemberStatus.APPROVED)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async remove(organizationId: OrganizationId, memberId: MemberId): Promise<void> {
    // Soft delete - status를 INACTIVE로 변경
    await db
      .update(organizationMembers)
      .set({
        status: OrganizationMemberStatus.INACTIVE,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.memberId, memberId.value)
        )
      );
  }

  async countByOrganization(organizationId: OrganizationId): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId.value));

    return result[0]?.count ?? 0;
  }

  async countActiveByOrganization(organizationId: OrganizationId): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId.value),
          eq(organizationMembers.status, OrganizationMemberStatus.APPROVED)
        )
      );

    return result[0]?.count ?? 0;
  }

  private mapToEntity(row: {
    id: number;
    organizationId: number;
    memberId: number;
    role: string;
    status: string;
    joinedAt: Date;
    updatedAt: Date;
  }): OrganizationMember {
    return OrganizationMember.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      memberId: row.memberId,
      role: row.role as OrganizationRole,
      status: row.status as OrganizationMemberStatus,
      joinedAt: row.joinedAt,
      updatedAt: row.updatedAt,
    });
  }
}
