import { and, eq, isNull } from 'drizzle-orm';
import {
  GenerationParticipant,
  GenerationParticipantProps,
  StudyCycle,
  StudyGeneration,
  CyclePeriod,
} from '@/domain/study-operations';
import {
  GenerationParticipantRepository,
  OutboxPort,
  StudyCycleRepository,
  StudyGenerationRepository,
} from '@/application/study-operations';
import { db } from '../../lib/db';
import {
  cycles,
  generationParticipantRoles,
  generationParticipants,
  generations,
  outboxMessages,
} from '../drizzle-db/schema';

export class DrizzleStudyGenerationRepository
  implements StudyGenerationRepository
{
  async save(generation: StudyGeneration): Promise<StudyGeneration> {
    if (!generation.id) {
      const [row] = await db
        .insert(generations)
        .values({
          organizationId: generation.organizationId,
          studyId: generation.studyId,
          ordinal: generation.ordinal,
          name: generation.displayName,
          status: generation.status,
          plannedCycleCount: generation.plannedCycleCount,
          cycleDurationDays: generation.cycleDurationDays,
          inactiveThresholdMissedCycles:
            generation.inactiveThresholdMissedCycles,
          startedAt: new Date(),
          isActive: generation.status === 'ACTIVE',
        })
        .returning();

      return StudyGeneration.create({
        id: row.id,
        studyId: row.studyId ?? generation.studyId,
        organizationId: row.organizationId,
        ordinal: row.ordinal ?? generation.ordinal,
        displayName: row.name,
        status: row.status,
        plannedCycleCount: row.plannedCycleCount,
        cycleDurationDays: row.cycleDurationDays,
        inactiveThresholdMissedCycles: row.inactiveThresholdMissedCycles,
      });
    }

    await db
      .update(generations)
      .set({
        status: generation.status,
        plannedCycleCount: generation.plannedCycleCount,
        cycleDurationDays: generation.cycleDurationDays,
        inactiveThresholdMissedCycles: generation.inactiveThresholdMissedCycles,
        updatedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));

    return generation;
  }
}

export class DrizzleStudyCycleRepository implements StudyCycleRepository {
  async findByGithubIssueUrl(issueUrl: string): Promise<StudyCycle | null> {
    const [row] = await db
      .select()
      .from(cycles)
      .where(eq(cycles.githubIssueUrl, issueUrl))
      .limit(1);
    if (!row) return null;
    return StudyCycle.create({
      id: row.id,
      generationId: row.generationId,
      sequence: row.week,
      period: CyclePeriod.create(row.startDate, row.endDate),
      status: row.status,
      githubIssueUrl: row.githubIssueUrl ?? undefined,
    });
  }

  async findById(id: number): Promise<StudyCycle | null> {
    const [row] = await db.select().from(cycles).where(eq(cycles.id, id)).limit(1);
    if (!row) return null;
    return StudyCycle.create({
      id: row.id,
      generationId: row.generationId,
      sequence: row.week,
      period: CyclePeriod.create(row.startDate, row.endDate),
      status: row.status,
      githubIssueUrl: row.githubIssueUrl ?? undefined,
    });
  }

  async save(cycle: StudyCycle): Promise<StudyCycle> {
    if (!cycle.id) {
      const [row] = await db
        .insert(cycles)
        .values({
          generationId: cycle.generationId,
          week: cycle.sequence,
          status: cycle.status,
          startDate: cycle.period.startAt,
          endDate: cycle.period.endAt,
          githubIssueUrl: cycle.githubIssueUrl,
        })
        .returning();

      return StudyCycle.create({
        id: row.id,
        generationId: row.generationId,
        sequence: row.week,
        period: CyclePeriod.create(row.startDate, row.endDate),
        status: row.status,
        githubIssueUrl: row.githubIssueUrl ?? undefined,
      });
    }

    await db
      .update(cycles)
      .set({
        status: cycle.status,
        startDate: cycle.period.startAt,
        endDate: cycle.period.endAt,
        githubIssueUrl: cycle.githubIssueUrl,
        closedAt: cycle.status === 'CLOSED' ? new Date() : undefined,
        completedAt: cycle.status === 'COMPLETED' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(cycles.id, cycle.id));

    return cycle;
  }
}

export class DrizzleGenerationParticipantRepository
  implements GenerationParticipantRepository
{
  async findById(id: number): Promise<GenerationParticipant | null> {
    const [row] = await db
      .select()
      .from(generationParticipants)
      .where(eq(generationParticipants.id, id))
      .limit(1);
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByGenerationAndMember(
    generationId: number,
    memberId: number
  ): Promise<GenerationParticipant | null> {
    const [row] = await db
      .select()
      .from(generationParticipants)
      .where(
        and(
          eq(generationParticipants.generationId, generationId),
          eq(generationParticipants.memberId, memberId)
        )
      )
      .limit(1);
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async save(
    participant: GenerationParticipant
  ): Promise<GenerationParticipant> {
    if (!participant.id) {
      const [row] = await db
        .insert(generationParticipants)
        .values({
          generationId: participant.generationId,
          memberId: participant.memberId,
          status: participant.status,
          markedInactiveAt:
            participant.status === 'INACTIVE' ? new Date() : undefined,
        })
        .returning();

      await this.replaceActiveRoles(row.id, participant.roles);
      return this.mapToDomain(row);
    }

    const [row] = await db
      .update(generationParticipants)
      .set({
        status: participant.status,
        approvedAt: participant.status === 'APPROVED' ? new Date() : undefined,
        markedInactiveAt:
          participant.status === 'INACTIVE' ? new Date() : undefined,
        removedAt: participant.status === 'REMOVED' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(generationParticipants.id, participant.id))
      .returning();

    await this.replaceActiveRoles(participant.id, participant.roles);
    return this.mapToDomain(row);
  }

  private async replaceActiveRoles(
    participantId: number,
    roles: GenerationParticipantProps['roles']
  ): Promise<void> {
    await db
      .update(generationParticipantRoles)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(generationParticipantRoles.generationParticipantId, participantId),
          isNull(generationParticipantRoles.revokedAt)
        )
      );

    if (!roles || roles.length === 0) return;

    await db.insert(generationParticipantRoles).values(
      roles.map((role) => ({
        generationParticipantId: participantId,
        role,
      }))
    );
  }

  private async mapToDomain(row: typeof generationParticipants.$inferSelect) {
    const roleRows = await db
      .select()
      .from(generationParticipantRoles)
      .where(
        and(
          eq(generationParticipantRoles.generationParticipantId, row.id),
          isNull(generationParticipantRoles.revokedAt)
        )
      );

    return GenerationParticipant.create({
      id: row.id,
      generationId: row.generationId,
      memberId: row.memberId,
      status: row.status,
      roles: roleRows.map((role) => role.role),
    });
  }
}

export class DrizzleOutboxPort implements OutboxPort {
  async publish(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await db.insert(outboxMessages).values({
      eventType,
      aggregateType: String(payload.aggregateType ?? 'study-operations'),
      aggregateId: String(payload.aggregateId ?? payload.cycleId ?? payload.generationId ?? 'unknown'),
      payload,
    });
  }
}
