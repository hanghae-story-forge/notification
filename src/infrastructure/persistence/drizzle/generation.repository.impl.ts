// Generation Repository Implementation - Drizzle ORM

import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { generations } from '../../../db/schema';
import { Generation, GenerationId } from '../../../domain/generation/generation.domain';
import { GenerationRepository } from '../../../domain/generation/generation.repository';
import { NotFoundError } from '../../../domain/common/errors';

export class DrizzleGenerationRepository implements GenerationRepository {
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

  async findActive(): Promise<Generation> {
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.isActive, true))
      .orderBy(generations.createdAt)
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundError('Active generation');
    }

    return this.mapToEntity(result[0]);
  }

  async save(generation: Generation): Promise<void> {
    const dto = generation.toDTO();
    await db
      .update(generations)
      .set({
        name: dto.name,
        startedAt: new Date(dto.startedAt),
        isActive: dto.isActive,
      })
      .where(eq(generations.id, dto.id));
  }

  private mapToEntity(row: {
    id: number;
    name: string;
    startedAt: Date;
    isActive: boolean;
  }): Generation {
    return Generation.create({
      id: row.id,
      name: row.name,
      startedAt: row.startedAt,
      isActive: row.isActive,
    });
  }
}
