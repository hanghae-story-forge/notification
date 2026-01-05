// Cycle Repository Implementation - Drizzle ORM

import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { cycles } from '../../../db/schema';
import { Cycle, CycleId } from '../../../domain/cycle/cycle.domain';
import { CycleRepository } from '../../../domain/cycle/cycle.repository';

export class DrizzleCycleRepository implements CycleRepository {
  async findById(id: CycleId): Promise<Cycle | null> {
    const result = await db
      .select()
      .from(cycles)
      .where(eq(cycles.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByIssueUrl(issueUrl: string): Promise<Cycle | null> {
    const result = await db
      .select()
      .from(cycles)
      .where(eq(cycles.githubIssueUrl, issueUrl))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByGeneration(generationId: number): Promise<Cycle[]> {
    const result = await db
      .select()
      .from(cycles)
      .where(eq(cycles.generationId, generationId));

    return result.map((row) => this.mapToEntity(row));
  }

  async save(cycle: Cycle): Promise<void> {
    const dto = cycle.toDTO();
    // 현재는 읽기 전용으로 사용
    await db
      .update(cycles)
      .set({
        week: dto.week,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        githubIssueUrl: dto.githubIssueUrl,
      })
      .where(eq(cycles.id, dto.id));
  }

  private mapToEntity(row: {
    id: number;
    week: number;
    startDate: Date;
    endDate: Date;
    githubIssueUrl: string | null;
  }): Cycle {
    return Cycle.create({
      id: row.id,
      week: row.week,
      startDate: row.startDate,
      endDate: row.endDate,
      githubIssueUrl: row.githubIssueUrl ?? undefined,
    });
  }
}
