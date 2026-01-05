import { z } from 'zod';
import {
  IGitHubParserService,
  ParsedCommentData,
  ParsedIssueData,
} from '@core/application/ports/services';
import { InvalidBlogUrlError } from '@core/domain/shared';

const GitHubCommentPayloadSchema = z.object({
  comment: z.object({
    id: z.number(),
    user: z.object({
      login: z.string(),
    }),
    body: z.string(),
  }),
  issue: z.object({
    html_url: z.string(),
  }),
});

const GitHubIssuePayloadSchema = z.object({
  issue: z.object({
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
  }),
});

export class GitHubWebhookParserService implements IGitHubParserService {
  async parseComment(commentData: unknown): Promise<ParsedCommentData> {
    const payload = GitHubCommentPayloadSchema.parse(commentData);

    const urlMatch = payload.comment.body.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) {
      throw new InvalidBlogUrlError('No URL found in comment');
    }

    return {
      githubUsername: payload.comment.user.login,
      blogUrl: urlMatch[1],
      commentId: String(payload.comment.id),
      issueUrl: payload.issue.html_url,
    };
  }

  async parseIssue(issueData: unknown): Promise<ParsedIssueData> {
    const payload = GitHubIssuePayloadSchema.parse(issueData);

    const week = this.parseWeekFromTitle(payload.issue.title);
    if (!week) {
      throw new Error('No week pattern found in title');
    }

    const dates = this.parseDatesFromBody(payload.issue.body);

    return {
      week,
      startDate: dates?.start || new Date(),
      endDate: dates?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      githubIssueUrl: payload.issue.html_url,
    };
  }

  private parseWeekFromTitle(title: string): number | null {
    const patterns = [
      /\[(\d+)주차\]/,
      /(\d+)주차/,
      /\[week\s*(\d+)\]/i,
      /week\s*(\d+)/i,
      /\[(\d+)\]\s*주/,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) return parseInt(match[1], 10);
    }

    return null;
  }

  private parseDatesFromBody(
    body: string | null
  ): { start: Date; end: Date } | null {
    if (!body) return null;

    const deadlinePattern =
      /(?:마감|deadline|due)[:\s]*(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}))?/i;
    const match = body.match(deadlinePattern);

    if (match) {
      const deadline = new Date(
        `${match[1]}${match[2] ? 'T' + match[2] : 'T23:59:59'}`
      );
      const start = new Date(deadline);
      start.setDate(start.getDate() - 7);

      return { start, end: deadline };
    }

    return null;
  }
}
