import { Hono } from 'hono';
import { db } from '../lib/db';
import { members, cycles, submissions, generations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { sendDiscordWebhook, createSubmissionMessage } from '../services/discord';

interface Env {
  DISCORD_WEBHOOK_URL?: string;
  GITHUB_WEBHOOK_SECRET?: string;
}

// 이슈 댓글 웹훅 페이로드
interface IssueCommentWebhookPayload {
  action: string;
  issue: {
    number: number;
    html_url: string;
    title: string;
  };
  comment: {
    id: number;
    user: {
      login: string;
    };
    body: string;
    html_url: string;
    created_at: string;
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
}

// 이슈 생성 웹훅 페이로드
interface IssuesWebhookPayload {
  action: string;
  issue: {
    number: number;
    html_url: string;
    title: string;
    body: string | null;
    created_at: string;
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
}

// 회차 번호 추출 (이슈 제목에서 파싱)
// 예: "[1주차] 제출하세요", "1주차", "[Week 1]" 등
function parseWeekFromTitle(title: string): number | null {
  // 다양한 패턴 시도
  const patterns = [
    /\[(\d+)주차\]/,           // [1주차]
    /(\d+)주차/,               // 1주차
    /\[week\s*(\d+)\]/i,       // [week 1]
    /week\s*(\d+)/i,           // week 1
    /\[(\d+)\]\s*주/,          // [1] 주
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

// 날짜 파싱 (이슈 본문에서 마감일 추출)
function parseDatesFromBody(body: string | null): { start: Date; end: Date } | null {
  if (!body) return null;

  // 마감일 패턴: "마감: 2025-01-15" 또는 "DEADLINE: 2025-01-15T23:59:59"
  const deadlinePattern = /(?:마감|deadline|due)[:\s]*(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}))?/i;
  const deadlineMatch = body.match(deadlinePattern);

  if (deadlineMatch) {
    const deadline = new Date(`${deadlineMatch[1]}${deadlineMatch[2] ? 'T' + deadlineMatch[2] : 'T23:59:59'}`);
    const start = new Date(deadline);
    start.setDate(start.getDate() - 7); // 기본적으로 7일 전 시작

    return { start, end: deadline };
  }

  return null;
}

const githubWebhook = new Hono<{ Bindings: Env }>();

// GitHub 웹훅 메인 핸들러
githubWebhook.post('/', async (c) => {
  const githubEvent = c.req.header('x-github-event');
  const payload = await c.req.json();

  switch (githubEvent) {
    case 'issue_comment':
      return handleIssueComment(payload as IssueCommentWebhookPayload, c);

    case 'issues':
      return handleIssues(payload as IssuesWebhookPayload);

    default:
      return c.json({ message: `Unhandled event: ${githubEvent}` }, 200);
  }
});

// 이슈 댓글 처리 (제출 기록)
async function handleIssueComment(payload: IssueCommentWebhookPayload, c: any) {
  // comment.created 이벤트만 처리
  if (payload.action !== 'created') {
    return c.json({ message: 'Ignored non-created action' });
  }

  const { comment, issue } = payload;
  const githubUsername = comment.user.login;
  const commentBody = comment.body;
  const commentId = String(comment.id);

  // 댓글에서 URL 추출 (http/https로 시작하는 링크)
  const urlMatch = commentBody.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    return c.json({ message: 'No URL found in comment' });
  }

  const blogUrl = urlMatch[1];

  // 해당 Issue에 연결된 사이클 찾기
  const activeCycles = await db
    .select({
      cycle: cycles,
    })
    .from(cycles)
    .where(eq(cycles.githubIssueUrl, issue.html_url));

  if (activeCycles.length === 0) {
    return c.json({ message: 'No cycle found for this issue' });
  }

  const cycle = activeCycles[0].cycle;

  // 멤버 찾기 (GitHub username으로)
  const memberList = await db
    .select()
    .from(members)
    .where(eq(members.github, githubUsername));

  if (memberList.length === 0) {
    return c.json({ message: 'Member not found' });
  }

  const member = memberList[0];

  // 이미 제출했는지 확인
  const existingSubmission = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.cycleId, cycle.id),
        eq(submissions.memberId, member.id)
      )
    );

  if (existingSubmission.length > 0) {
    return c.json({ message: 'Already submitted' });
  }

  // 제출 저장
  await db.insert(submissions).values({
    cycleId: cycle.id,
    memberId: member.id,
    url: blogUrl,
    githubCommentId: commentId,
  });

  // Discord 알림 전송
  const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (discordWebhookUrl) {
    const cycleName = `${cycle.week}주차`;
    await sendDiscordWebhook(
      discordWebhookUrl,
      createSubmissionMessage(member.name, blogUrl, cycleName)
    );
  }

  return c.json({ message: 'Submission recorded' });
}

// 이슈 생성 처리 (회차 생성)
async function handleIssues(payload: IssuesWebhookPayload) {
  // opened 이벤트만 처리
  if (payload.action !== 'opened') {
    return new Response(JSON.stringify({ message: 'Ignored non-opened action' }), { status: 200 });
  }

  const { issue } = payload;

  // 이슈 제목에서 회차 번호 추출
  const week = parseWeekFromTitle(issue.title);
  if (!week) {
    return new Response(
      JSON.stringify({ message: 'No week pattern found in title, ignoring' }),
      { status: 200 }
    );
  }

  // 활성화된 기수 찾기 (가장 최근에 생성된 활성 기수)
  const activeGenerations = await db
    .select()
    .from(generations)
    .where(eq(generations.isActive, true))
    .orderBy(generations.createdAt);

  if (activeGenerations.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active generation found' }),
      { status: 400 }
    );
  }

  const generation = activeGenerations[0];

  // 이미 동일한 회차가 있는지 확인
  const existingCycle = await db
    .select()
    .from(cycles)
    .where(and(eq(cycles.generationId, generation.id), eq(cycles.week, week)));

  if (existingCycle.length > 0) {
    return new Response(
      JSON.stringify({ message: 'Cycle already exists for this week' }),
      { status: 200 }
    );
  }

  // 날짜 계산 (본문에서 파싱 또는 기본값 사용)
  const dates = parseDatesFromBody(issue.body);
  const now = new Date();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;

  const startDate = dates?.start || now;
  const endDate = dates?.end || new Date(now.getTime() + weekInMs);

  // 회차 생성
  const newCycle = await db
    .insert(cycles)
    .values({
      generationId: generation.id,
      week,
      startDate,
      endDate,
      githubIssueUrl: issue.html_url,
    })
    .returning();

  return new Response(
    JSON.stringify({
      message: 'Cycle created',
      cycle: newCycle[0],
    }),
    { status: 201 }
  );
}

export { githubWebhook };
