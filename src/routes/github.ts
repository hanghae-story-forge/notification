import { Hono } from 'hono';
import { db } from '../lib/db';
import { members, cycles, submissions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { sendDiscordWebhook, createSubmissionMessage } from '../services/discord';

interface Env {
  DISCORD_WEBHOOK_URL?: string;
}

interface GitHubWebhookPayload {
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

const githubWebhook = new Hono<{ Bindings: Env }>();

// GitHub Issue 댓글 webhook
githubWebhook.post('/', async (c) => {
  const payload = (await c.req.json()) as GitHubWebhookPayload;

  // comment.created 이벤트만 처리
  if (payload.action !== 'created') {
    return c.json({ message: 'Ignored' });
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

  // 해당 Issue에 연결된 활성화된 사이클 찾기
  const activeCycles = await db
    .select({
      cycle: cycles,
    })
    .from(cycles)
    .where(eq(cycles.githubIssueUrl, issue.html_url));

  if (activeCycles.length === 0) {
    return c.json({ message: 'No active cycle found for this issue' });
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
    const cycleName = `주차 ${cycle.week}`;
    await sendDiscordWebhook(
      discordWebhookUrl,
      createSubmissionMessage(member.name, blogUrl, cycleName)
    );
  }

  return c.json({ message: 'Submission recorded' });
});

export { githubWebhook };
