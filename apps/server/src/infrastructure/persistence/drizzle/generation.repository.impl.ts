// Generation Repository Implementation - Drizzle ORM

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import { generations, cycles, generationMembers } from '../drizzle-db/schema';
import {
  Generation,
  GenerationId,
} from '../../../domain/generation/generation.domain';
import { GenerationRepository } from '../../../domain/generation/generation.repository';

export class DrizzleGenerationRepository implements GenerationRepository {
  async save(generation: Generation): Promise<Generation> {
    const dto = generation.toDTO();

    // ID가 0이면 새로운 기수 (생성)
    if (dto.id === 0) {
      const result = await db
        .insert(generations)
        .values({
          organizationId: dto.organizationId,
          name: dto.name,
          startedAt: new Date(dto.startedAt),
          isActive: dto.isActive,
        })
        .returning();

      // 생성된 ID로 엔티티 업데이트
      return this.mapToEntity(result[0]);
    } else {
      // 기존 기수 업데이트
      await db
        .update(generations)
        .set({
          organizationId: dto.organizationId,
          name: dto.name,
          startedAt: new Date(dto.startedAt),
          isActive: dto.isActive,
        })
        .where(eq(generations.id, dto.id));

      return generation;
    }
  }

  async findById(id: GenerationId): Promise<Generation | null> {
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findActive(): Promise<Generation | null> {
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.isActive, true))
      .orderBy(generations.createdAt)
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findActiveByOrganization(
    organizationId: number
  ): Promise<Generation | null> {
    const result = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.organizationId, organizationId),
          eq(generations.isActive, true)
        )
      )
      .orderBy(generations.createdAt)
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByOrganization(organizationId: number): Promise<Generation[]> {
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.organizationId, organizationId))
      .orderBy(generations.createdAt);

    return result.map((row) => this.mapToEntity(row));
  }

  async findAll(): Promise<Generation[]> {
    const result = await db.select().from(generations);
    return result.map((row) => this.mapToEntity(row));
  }

  async findAllWithStats(): Promise<
    Array<{
      generation: Generation;
      cycleCount: number;
      memberCount: number;
    }>
  > {
    const result = await db
      .select({
        generation: {
          id: generations.id,
          organizationId: generations.organizationId,
          name: generations.name,
          startedAt: generations.startedAt,
          isActive: generations.isActive,
          createdAt: generations.createdAt,
        },
        cycleCount: sql<number>`count(distinct ${cycles.id})`,
        memberCount: sql<number>`count(distinct ${generationMembers.id})`,
      })
      .from(generations)
      .leftJoin(cycles, eq(generations.id, cycles.generationId))
      .leftJoin(
        generationMembers,
        eq(generations.id, generationMembers.generationId)
      )
      .groupBy(generations.id);

    return result.map((row) => ({
      generation: this.mapToEntity(row.generation),
      cycleCount: row.cycleCount,
      memberCount: row.memberCount,
    }));
  }

  private mapToEntity(row: {
    id: number;
    organizationId: number;
    name: string;
    startedAt: Date;
    isActive: boolean;
    createdAt: Date;
  }): Generation {
    return Generation.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      startedAt: row.startedAt,
      isActive: row.isActive,
      createdAt: row.createdAt,
    });
  }
}
