export interface ParsedCommentData {
  githubUsername: string;
  blogUrl: string;
  commentId: string;
  issueUrl: string;
}

export interface ParsedIssueData {
  week: number;
  startDate: Date;
  endDate: Date;
  githubIssueUrl: string;
}

export interface IGitHubParserService {
  parseComment(commentData: unknown): Promise<ParsedCommentData>;
  parseIssue(issueData: unknown): Promise<ParsedIssueData>;
}
