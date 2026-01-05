import { Container } from 'inversify';
import { TYPES } from '../../di/tokens';
import { FindSubmissionStatusUseCase } from '../../core/application/use-cases';
import { db } from '../../lib/db';
import {
  members,
  generations,
  cycles,
  submissions,
} from '../../infrastructure/persistence/drizzle/schema';
import { eq, and } from 'drizzle-orm';

interface GraphQLContext {
  di: Container;
}

export const createResolvers = (_di: Container) => ({
  Query: {
    // 멤버 조회
    members: async () => {
      return await db.select().from(members);
    },

    member: async (_: unknown, args: { github: string }) => {
      const result = await db
        .select()
        .from(members)
        .where(eq(members.github, args.github));
      return result[0];
    },

    // 기수 조회
    generations: async () => {
      return await db.select().from(generations);
    },

    generation: async (_: unknown, args: { id: number }) => {
      const result = await db
        .select()
        .from(generations)
        .where(eq(generations.id, args.id));
      return result[0];
    },

    activeGeneration: async () => {
      const result = await db
        .select()
        .from(generations)
        .where(eq(generations.isActive, true));
      return result[0];
    },

    // 사이클 조회
    cycles: async (_: unknown, args: { generationId?: number }) => {
      if (args.generationId) {
        return await db
          .select()
          .from(cycles)
          .where(eq(cycles.generationId, args.generationId));
      }
      return await db.select().from(cycles);
    },

    cycle: async (_: unknown, args: { id: number }) => {
      const result = await db
        .select()
        .from(cycles)
        .where(eq(cycles.id, args.id));
      return result[0];
    },

    activeCycle: async () => {
      const activeGen = await db
        .select()
        .from(generations)
        .where(eq(generations.isActive, true));
      if (activeGen.length === 0) return null;

      const now = new Date();
      const result = await db
        .select()
        .from(cycles)
        .where(
          and(
            eq(cycles.generationId, activeGen[0].id),
            eq(cycles.startDate, now)
          )
        );
      return result[0] || null;
    },

    // 제출 현황 (Use Case 사용)
    cycleStatus: async (
      _: unknown,
      args: { cycleId: number },
      context: GraphQLContext
    ) => {
      const useCase = context.di.get<FindSubmissionStatusUseCase>(
        TYPES.FindSubmissionStatusUseCase
      );
      return await useCase.execute(args.cycleId);
    },
  },

  Mutation: {
    addMember: async (
      _: unknown,
      args: { github: string; name: string; discordId?: string }
    ) => {
      const result = await db
        .insert(members)
        .values({
          github: args.github,
          name: args.name,
          discordId: args.discordId,
        })
        .returning();
      return result[0];
    },

    addGeneration: async (
      _: unknown,
      args: { name: string; startedAt: string }
    ) => {
      const result = await db
        .insert(generations)
        .values({
          name: args.name,
          startedAt: new Date(args.startedAt),
          isActive: true,
        })
        .returning();
      return result[0];
    },

    addCycle: async (
      _: unknown,
      args: {
        generationId: number;
        week: number;
        startDate: string;
        endDate: string;
        githubIssueUrl: string;
      }
    ) => {
      const result = await db
        .insert(cycles)
        .values({
          generationId: args.generationId,
          week: args.week,
          startDate: new Date(args.startDate),
          endDate: new Date(args.endDate),
          githubIssueUrl: args.githubIssueUrl,
        })
        .returning();
      return result[0];
    },

    addSubmission: async (
      _: unknown,
      args: {
        cycleId: number;
        memberId: number;
        url: string;
        githubCommentId?: string;
      }
    ) => {
      const result = await db
        .insert(submissions)
        .values({
          cycleId: args.cycleId,
          memberId: args.memberId,
          url: args.url,
          githubCommentId: args.githubCommentId,
        })
        .returning();
      return result[0];
    },
  },
});
