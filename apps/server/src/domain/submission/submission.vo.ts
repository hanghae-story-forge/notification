// Value Objects for Submission Domain

import { DomainError } from '../common/errors';

// 블로그 URL Value Object
export class BlogUrl {
  private constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidBlogUrlError(value);
    }
  }

  private isValid(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static create(url: string): BlogUrl {
    return new BlogUrl(url);
  }

  equals(other: BlogUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class InvalidBlogUrlError extends DomainError {
  readonly code = 'INVALID_BLOG_URL' as const;

  constructor(url: string) {
    super(`Invalid blog URL: ${url}`);
  }
}

// GitHub Comment ID Value Object
export class GithubCommentId {
  private constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidGithubCommentIdError(value);
    }
  }

  static create(id: string | number): GithubCommentId {
    return new GithubCommentId(String(id));
  }

  equals(other: GithubCommentId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class InvalidGithubCommentIdError extends DomainError {
  readonly code = 'INVALID_GITHUB_COMMENT_ID' as const;

  constructor(id: string) {
    super(`Invalid GitHub comment ID: ${id}`);
  }
}
