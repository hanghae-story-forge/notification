import { db } from '../lib/db.js';
import { members, generations, cycles, submissions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const resolvers = {
  Query: {
    // 멤버 조회
    members: async () => {
      return await db.select().from(members);
    },

    member: async (_: unknown, args: { github: string }) => {
      const result = await db.select().from(members).where(eq(members.github, args.github));
      return result[0];
    },

    // 기수 조회
    generations: async () => {
      return await db.select().from(generations);
    },

    generation: async (_: unknown, args: { id: number }) => {
      const result = await db.select().from(generations).where(eq(generations.id, args.id));
      return result[0];
    },

    activeGeneration: async () => {
      const result = await db.select().from(generations).where(eq(generations.isActive, true));
      return result[0];
    },

    // 사이클 조회
    cycles: async (_: unknown, args: { generationId?: number }) => {
      if (args.generationId) {
        return await db.select().from(cycles).where(eq(cycles.generationId, args.generationId));
      }
      return await db.select().from(cycles);
    },

    cycle: async (_: unknown, args: { id: number }) => {
      const result = await db.select().from(cycles).where(eq(cycles.id, args.id));
      return result[0];
    },

    activeCycle: async () => {
      const activeGen = await db.select().from(generations).where(eq(generations.isActive, true));
      if (activeGen.length === 0) return null;

      const now = new Date();
      const result = await db
        .select()
        .from(cycles)
        .where(
          and(
            eq(cycles.generationId, activeGen[0].id),
            eq(cycles.startDate, now) // 현재 진행 중인 사이클 찾기
          )
        );
      return result[0] || null;
    },

    // 제출 현황
    cycleStatus: async (_: unknown, args: { cycleId: number }) => {
      const cycleList = await db.select().from(cycles).where(eq(cycles.id, args.cycleId));
      if (cycleList.length === 0) {
        throw new Error('Cycle not found');
      }
      const cycle = cycleList[0];

      const allMembers = await db.select().from(members);

      const submissionList = await db
        .select({
          submission: submissions,
          member: members,
        })
        .from(submissions)
        .innerJoin(members, eq(submissions.memberId, members.id))
        .where(eq(submissions.cycleId, args.cycleId));

      const submittedIds = new Set(submissionList.map((s) => s.submission.memberId));

      const submitted = submissionList.map((s) => ({
        member: s.member,
        url: s.submission.url,
        submittedAt: s.submission.submittedAt.toISOString(),
      }));

      const notSubmitted = allMembers.filter((m) => !submittedIds.has(m.id));

      return {
        cycle,
        summary: {
          total: allMembers.length,
          submitted: submitted.length,
          notSubmitted: notSubmitted.length,
        },
        submitted,
        notSubmitted,
      };
    },
  },

  Mutation: {
    addMember: async (_: unknown, args: { github: string; name: string; discordId?: string }) => {
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

    addGeneration: async (_: unknown, args: { name: string; startedAt: string }) => {
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
};
