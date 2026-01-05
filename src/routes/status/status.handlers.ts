import { db } from '@/lib/db';
import { members, generations, cycles, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createStatusMessage } from '@/services/discord';
import type { AppContext } from '@/libs';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// 제출 현황 조회
export const getStatus = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));

  // 사이클 정보 조회
  const cycleInfo = await db
    .select({
      cycle: cycles,
      generation: generations,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .where(eq(cycles.id, cycleId));

  if (cycleInfo.length === 0) {
    return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
  }

  const { cycle, generation } = cycleInfo[0];

  // 제출 목록 조회
  const submissionList = await db
    .select({
      submission: submissions,
      member: members,
    })
    .from(submissions)
    .innerJoin(members, eq(submissions.memberId, members.id))
    .where(eq(submissions.cycleId, cycleId));

  // 전체 멤버
  const allMembers = await db.select().from(members);

  const submittedIds = new Set(
    submissionList.map((s) => s.submission.memberId)
  );
  const submitted = submissionList.map((s) => ({
    name: s.member.name,
    github: s.member.github,
    url: s.submission.url,
    submittedAt: s.submission.submittedAt.toISOString(),
  }));

  const notSubmitted = allMembers
    .filter((m) => !submittedIds.has(m.id))
    .map((m) => ({
      name: m.name,
      github: m.github,
    }));

  return c.json(
    {
      cycle: {
        id: cycle.id,
        week: cycle.week,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        generationName: generation.name,
      },
      summary: {
        total: allMembers.length,
        submitted: submitted.length,
        notSubmitted: notSubmitted.length,
      },
      submitted,
      notSubmitted,
    },
    HttpStatusCodes.OK
  );
};

// 제출 현황을 Discord 메시지 포맷으로 반환
export const getStatusDiscord = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));

  const cycleInfo = await db
    .select({
      cycle: cycles,
      generation: generations,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .where(eq(cycles.id, cycleId));

  if (cycleInfo.length === 0) {
    return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
  }

  const { cycle, generation } = cycleInfo[0];

  const submissionList = await db
    .select({
      memberId: submissions.memberId,
    })
    .from(submissions)
    .where(eq(submissions.cycleId, cycleId));

  const allMembers = await db.select().from(members);

  const submittedIds = new Set(submissionList.map((s) => s.memberId));

  const submittedNames = allMembers
    .filter((m) => submittedIds.has(m.id))
    .map((m) => m.name);

  const notSubmittedNames = allMembers
    .filter((m) => !submittedIds.has(m.id))
    .map((m) => m.name);

  const discordMessage = createStatusMessage(
    `${generation.name} - ${cycle.week}주차`,
    submittedNames,
    notSubmittedNames,
    cycle.endDate
  );

  return c.json(discordMessage, HttpStatusCodes.OK);
};
