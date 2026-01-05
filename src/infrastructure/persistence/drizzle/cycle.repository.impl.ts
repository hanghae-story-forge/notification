// Cycle Repository Implementation - Drizzle ORM

import { eq, and, lt, gt } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { cycles } from '../../../db/schema';
import { Cycle, CycleId } from '../../../domain/cycle/cycle.domain';
import { CycleRepository } from '../../../domain/cycle/cycle.repository';

export class DrizzleCycleRepository implements CycleRepository {
  async save(cycle: Cycle): Promise<void> {
    const dto = cycle.toDTO();

    // ID가 0이면 새로운 사이클 (생성)
    if (dto.id === 0) {
      await db.insert(cycles).values({
        generationId: dto.generationId,
        week: dto.week,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        githubIssueUrl: dto.githubIssueUrl,
      });
    } else {
      // 기존 사이클 업데이트
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
  }

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

  async findByGenerationAndWeek(
    generationId: number,
    week: number
  ): Promise<Cycle | null> {
    const result = await db
      .select()
      .from(cycles)
      .where(and(eq(cycles.generationId, generationId), eq(cycles.week, week)))
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

  async findActiveCyclesByGeneration(generationId: number): Promise<Cycle[]> {
    const now = new Date();

    const result = await db
      .select()
      .from(cycles)
      .where(
        and(
          eq(cycles.generationId, generationId),
          lt(cycles.startDate, now),
          gt(cycles.endDate, now)
        )
      );

    return result.map((row) => this.mapToEntity(row));
  }

  async findCyclesWithDeadlineInRange(
    generationId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Cycle[]> {
    const result = await db
      .select()
      .from(cycles)
      .where(
        and(
          eq(cycles.generationId, generationId),
          lt(cycles.endDate, endTime),
          gt(cycles.endDate, startTime)
        )
      );

    return result.map((row) => this.mapToEntity(row));
  }

  private mapToEntity(row: {
    id: number;
    generationId: number;
    week: number;
    startDate: Date;
    endDate: Date;
    githubIssueUrl: string | null;
    createdAt: Date;
  }): Cycle {
    return Cycle.create({
      id: row.id,
      generationId: row.generationId,
      week: row.week,
      startDate: row.startDate,
      endDate: row.endDate,
      githubIssueUrl: row.githubIssueUrl ?? undefined,
      createdAt: row.createdAt,
    });
  }
}
