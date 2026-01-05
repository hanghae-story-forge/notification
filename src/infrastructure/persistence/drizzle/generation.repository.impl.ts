// Generation Repository Implementation - Drizzle ORM

import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { generations } from '../../../db/schema';
import {
  Generation,
  GenerationId,
} from '../../../domain/generation/generation.domain';
import { GenerationRepository } from '../../../domain/generation/generation.repository';

export class DrizzleGenerationRepository implements GenerationRepository {
  async save(generation: Generation): Promise<void> {
    const dto = generation.toDTO();

    // ID가 0이면 새로운 기수 (생성)
    if (dto.id === 0) {
      await db.insert(generations).values({
        name: dto.name,
        startedAt: new Date(dto.startedAt),
        isActive: dto.isActive,
      });
    } else {
      // 기존 기수 업데이트
      await db
        .update(generations)
        .set({
          name: dto.name,
          startedAt: new Date(dto.startedAt),
          isActive: dto.isActive,
        })
        .where(eq(generations.id, dto.id));
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

  async findAll(): Promise<Generation[]> {
    const result = await db.select().from(generations);
    return result.map((row) => this.mapToEntity(row));
  }

  private mapToEntity(row: {
    id: number;
    name: string;
    startedAt: Date;
    isActive: boolean;
    createdAt: Date;
  }): Generation {
    return Generation.reconstitute({
      id: row.id,
      name: row.name,
      startedAt: row.startedAt,
      isActive: row.isActive,
      createdAt: row.createdAt,
    });
  }
}
