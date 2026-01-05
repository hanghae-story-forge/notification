import type { AppContext } from '@/lib/router';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { z } from 'zod';
import type {
  IssueCommentWebhookPayloadSchema,
  IssuesWebhookPayloadSchema,
} from './github.routes';

// DDD Layer imports
import { RecordSubmissionCommand, CreateCycleCommand } from '@/application/commands';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { SubmissionService } from '@/domain/submission/submission.service';
import { DiscordWebhookService } from '@/infrastructure/external/discord/discord.webhook';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@/domain/common/errors';

// ========================================
// Repository & Service Instances
// ========================================

const submissionRepo = new DrizzleSubmissionRepository();
const cycleRepo = new DrizzleCycleRepository();
const memberRepo = new DrizzleMemberRepository();
const generationRepo = new DrizzleGenerationRepository();
const submissionService = new SubmissionService(submissionRepo);
const discordService = new DiscordWebhookService();

const recordSubmissionCommand = new RecordSubmissionCommand(
  cycleRepo,
  memberRepo,
  submissionRepo,
  submissionService
);

const createCycleCommand = new CreateCycleCommand(cycleRepo, generationRepo);

// ========================================
// Utilities
// ========================================

// 유틸리티: 회차 번호 추출 (이슈 제목에서 파싱)
function parseWeekFromTitle(title: string): number | null {
  const patterns = [
    /\[(\d+)주차\]/, // [1주차]
    /(\d+)주차/, // 1주차
    /\[week\s*(\d+)\]/i, // [week 1]
    /week\s*(\d+)/i, // week 1
    /\[(\d+)\]\s*주/, // [1] 주
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

// 유틸리티: 날짜 파싱 (이슈 본문에서 마감일 추출)
function parseDatesFromBody(
  body: string | null
): { start: Date; end: Date } | null {
  if (!body) return null;

  // 마감일 패턴: "마감: 2025-01-15" 또는 "DEADLINE: 2025-01-15T23:59:59"
  const deadlinePattern =
    /(?:마감|deadline|due)[:\s]*(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}))?/i;
  const deadlineMatch = body.match(deadlinePattern);

  if (deadlineMatch) {
    const deadline = new Date(
      `${deadlineMatch[1]}${
        deadlineMatch[2] ? 'T' + deadlineMatch[2] : 'T23:59:59'
      }`
    );
    const start = new Date(deadline);
    start.setDate(start.getDate() - 7); // 기본적으로 7일 전 시작

    return { start, end: deadline };
  }

  return null;
}

// ========================================
// Handlers
// ========================================

// 이슈 댓글 처리 (제출 기록) - DDD로 리팩토링
export const handleIssueComment = async (c: AppContext) => {
  const payload = (await c.req.json()) as z.infer<
    typeof IssueCommentWebhookPayloadSchema
  >;
  const { comment, issue } = payload;

  const githubUsername = comment.user.login;
  const commentBody = comment.body;
  const commentId = String(comment.id);

  // 댓글에서 URL 추출 (http/https로 시작하는 링크)
  const urlMatch = commentBody.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    return c.json(
      { message: 'No URL found in comment' },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  const blogUrl = urlMatch[1];

  try {
    // Command 실행 (DDD Use Case)
    const result = await recordSubmissionCommand.execute({
      githubUsername,
      blogUrl,
      githubCommentId: commentId,
      githubIssueUrl: issue.html_url,
    });

    // Discord 알림 전송
    await discordService.sendSubmissionNotification(
      result.memberName,
      result.submission.url.value,
      result.cycleName
    );

    return c.json({ message: 'Submission recorded' }, HttpStatusCodes.OK);
  } catch (error) {
    // 도메인 에러 처리
    if (error instanceof NotFoundError) {
      return c.json({ message: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    if (error instanceof ConflictError) {
      return c.json(
        { message: error.message },
        HttpStatusCodes.OK // 이미 제출됨은 에러가 아님
      );
    }
    if (error instanceof ValidationError) {
      return c.json({ message: error.message }, HttpStatusCodes.BAD_REQUEST);
    }

    // 알 수 없는 에러
    console.error('Unexpected error in handleIssueComment:', error);
    return c.json(
      { message: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// 이슈 생성 처리 (회차 생성) - DDD로 리팩토링
export const handleIssues = async (c: AppContext) => {
  const payload = (await c.req.json()) as z.infer<
    typeof IssuesWebhookPayloadSchema
  >;
  const { issue } = payload;

  // 이슈 제목에서 회차 번호 추출
  const week = parseWeekFromTitle(issue.title);
  if (!week) {
    return c.json(
      { message: 'No week pattern found in title, ignoring' },
      HttpStatusCodes.OK
    );
  }

  // 날짜 계산 (본문에서 파싱 또는 기본값 사용)
  const dates = parseDatesFromBody(issue.body);
  const now = new Date();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;

  const startDate = dates?.start ?? now;
  const endDate = dates?.end ?? new Date(now.getTime() + weekInMs);

  try {
    // Command 실행 (DDD Use Case)
    const result = await createCycleCommand.execute({
      week,
      startDate,
      endDate,
      githubIssueUrl: issue.html_url,
    });

    return c.json(
      {
        message: 'Cycle created',
        cycle: result.cycle.toDTO(),
        generation: result.generationName,
      },
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    // 도메인 에러 처리
    if (error instanceof NotFoundError) {
      return c.json({ message: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    if (error instanceof ConflictError) {
      return c.json(
        { message: error.message },
        HttpStatusCodes.OK // 이미 존재함은 에러가 아님
      );
    }
    if (error instanceof ValidationError) {
      return c.json({ message: error.message }, HttpStatusCodes.BAD_REQUEST);
    }

    // 알 수 없는 에러
    console.error('Unexpected error in handleIssues:', error);
    return c.json(
      { message: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const handleUnknownEvent = async (c: AppContext) => {
  const githubEvent = c.req.header('x-github-event');
  return c.json(
    { message: `Unhandled event: ${githubEvent}` },
    HttpStatusCodes.OK
  );
};
