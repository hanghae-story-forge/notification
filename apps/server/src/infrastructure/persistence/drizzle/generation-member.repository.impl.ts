// GenerationMember Repository Implementation - Drizzle ORM

import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db';
import {
  generationMembers,
  generations,
  organizations,
} from '../drizzle-db/schema';
import {
  GenerationMember,
  GenerationMemberId,
} from '../../../domain/generation-member/generation-member.domain';
import { GenerationMemberRepository } from '../../../domain/generation-member/generation-member.repository';
import { MemberId } from '../../../domain/member/member.domain';

export class DrizzleGenerationMemberRepository implements GenerationMemberRepository {
  async save(generationMember: GenerationMember): Promise<void> {
    const dto = generationMember.toDTO();

    // ID가 0이면 새로운 기수원 (생성)
    if (dto.id === 0) {
      await db.insert(generationMembers).values({
        generationId: dto.generationId,
        memberId: dto.memberId,
        joinedAt: new Date(dto.joinedAt),
      });
    } else {
      // 기수원은 업데이트 불가 (joinAt만 존재)
      throw new Error('GenerationMember cannot be updated');
    }
  }

  async findById(id: GenerationMemberId): Promise<GenerationMember | null> {
    const result = await db
      .select()
      .from(generationMembers)
      .where(eq(generationMembers.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByGenerationAndMember(
    generationId: number,
    memberId: number
  ): Promise<GenerationMember | null> {
    const result = await db
      .select()
      .from(generationMembers)
      .where(
        and(
          eq(generationMembers.generationId, generationId),
          eq(generationMembers.memberId, memberId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByGeneration(generationId: number): Promise<GenerationMember[]> {
    const result = await db
      .select()
      .from(generationMembers)
      .where(eq(generationMembers.generationId, generationId));

    return result.map((row) => this.mapToEntity(row));
  }

  async findByMember(memberId: MemberId): Promise<GenerationMember[]> {
    const result = await db
      .select()
      .from(generationMembers)
      .where(eq(generationMembers.memberId, memberId.value));

    return result.map((row) => this.mapToEntity(row));
  }

  async findByMemberWithGenerations(memberId: MemberId): Promise<
    Array<{
      generationMember: GenerationMember;
      generation: {
        id: number;
        name: string;
        organizationId: number;
        startedAt: Date;
        isActive: boolean;
      } | null;
      organization: { id: number; name: string } | null;
    }>
  > {
    const result = await db
      .select({
        generationMember: {
          id: generationMembers.id,
          generationId: generationMembers.generationId,
          memberId: generationMembers.memberId,
          joinedAt: generationMembers.joinedAt,
        },
        generation: {
          id: generations.id,
          name: generations.name,
          organizationId: generations.organizationId,
          startedAt: generations.startedAt,
          isActive: generations.isActive,
        },
        organization: {
          id: organizations.id,
          name: organizations.name,
        },
      })
      .from(generationMembers)
      .innerJoin(
        generations,
        eq(generationMembers.generationId, generations.id)
      )
      .innerJoin(
        organizations,
        eq(generations.organizationId, organizations.id)
      )
      .where(eq(generationMembers.memberId, memberId.value));

    return result.map((row) => ({
      generationMember: this.mapToEntity(row.generationMember),
      generation: row.generation
        ? {
            id: row.generation.id,
            name: row.generation.name,
            organizationId: row.generation.organizationId,
            startedAt: row.generation.startedAt,
            isActive: row.generation.isActive,
          }
        : null,
      organization: row.organization
        ? { id: row.organization.id, name: row.organization.name }
        : null,
    }));
  }

  async delete(generationMember: GenerationMember): Promise<void> {
    await db
      .delete(generationMembers)
      .where(eq(generationMembers.id, generationMember.id.value));
  }

  private mapToEntity(row: {
    id: number;
    generationId: number;
    memberId: number;
    joinedAt: Date;
  }): GenerationMember {
    return GenerationMember.reconstitute({
      id: row.id,
      generationId: row.generationId,
      memberId: row.memberId,
      joinedAt: row.joinedAt,
    });
  }
}
