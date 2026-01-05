import { db } from '@/lib/db';
import { members, generations, cycles, submissions } from '@/db/schema';
import { eq, and, lt, gt } from 'drizzle-orm';
import type { AppContext } from '@/libs';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { sendDiscordWebhook, createReminderMessage } from '@/services/discord';

// n8n용 리마인더 대상 목록 조회
export const getReminderCycles = async (c: AppContext) => {
  const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');
  const now = new Date();
  const deadline = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

  // 마감 시간이 deadline 근처인 활성화된 사이클 찾기
  const activeCycles = await db
    .select({
      cycle: cycles,
      generation: generations,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .where(and(eq(generations.isActive, true), lt(cycles.endDate, deadline), gt(cycles.endDate, now)));

  const result = activeCycles.map(({ cycle, generation }) => ({
    cycleId: cycle.id,
    cycleName: `${generation.name} - ${cycle.week}주차`,
    endDate: cycle.endDate.toISOString(),
    githubIssueUrl: cycle.githubIssueUrl ?? undefined,
  }));

  return c.json({ cycles: result }, HttpStatusCodes.OK);
};

// 특정 사이클의 미제출자 목록 조회
export const getNotSubmittedMembers = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));

  // 사이클 정보 조회
  const cycleList = await db.select().from(cycles).where(eq(cycles.id, cycleId));

  if (cycleList.length === 0) {
    return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
  }

  const cycle = cycleList[0];

  // 기수의 모든 멤버 찾기
  // TODO: 기수-멤버 연결 테이블이 필요할 수 있음
  // 일단 전체 멤버 중에서 제출 안 된 사람 찾기
  const allMembers = await db.select().from(members);

  // 제출한 멤버 ID 목록
  const submittedMembers = await db
    .select({ memberId: submissions.memberId })
    .from(submissions)
    .where(eq(submissions.cycleId, cycleId));

  const submittedIds = new Set(submittedMembers.map((s) => s.memberId));

  // 미제출자 목록
  const notSubmitted = allMembers
    .filter((m) => !submittedIds.has(m.id))
    .map((m) => ({
      github: m.github,
      name: m.name,
      discordId: m.discordId,
    }));

  return c.json(
    {
      cycleId: cycle.id,
      week: cycle.week,
      endDate: cycle.endDate.toISOString(),
      notSubmitted,
      submittedCount: submittedMembers.length,
      totalMembers: allMembers.length,
    },
    HttpStatusCodes.OK
  );
};

// 리마인더 알림 발송 (GitHub Actions용)
export const sendReminderNotifications = async (c: AppContext) => {
  const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');
  const now = new Date();
  const deadline = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

  // 마감 시간이 deadline 근처인 활성화된 사이클 찾기
  const activeCycles = await db
    .select({
      cycle: cycles,
      generation: generations,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .where(and(eq(generations.isActive, true), lt(cycles.endDate, deadline), gt(cycles.endDate, now)));

  const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    return c.json({ error: 'DISCORD_WEBHOOK_URL not configured' }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  const sentCycles: Array<{ cycleId: number; cycleName: string }> = [];

  for (const { cycle, generation } of activeCycles) {
    // 제출한 멤버 ID 목록
    const submittedMembers = await db
      .select({ memberId: submissions.memberId })
      .from(submissions)
      .where(eq(submissions.cycleId, cycle.id));

    const submittedIds = new Set(submittedMembers.map((s) => s.memberId));

    // 미제출자 목록
    const allMembers = await db.select().from(members);
    const notSubmitted = allMembers
      .filter((m) => !submittedIds.has(m.id))
      .map((m) => m.name);

    if (notSubmitted.length === 0) {
      continue; // 모두 제출했으면 알림 스킵
    }

    const cycleName = `${generation.name} - ${cycle.week}주차`;

    // Discord 알림 전송
    await sendDiscordWebhook(
      discordWebhookUrl,
      createReminderMessage(cycleName, cycle.endDate, notSubmitted)
    );

    sentCycles.push({ cycleId: cycle.id, cycleName });
  }

  return c.json(
    {
      sent: sentCycles.length,
      cycles: sentCycles,
    },
    HttpStatusCodes.OK
  );
};
