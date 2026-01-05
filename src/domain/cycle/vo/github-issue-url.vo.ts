// Value Object: GitHub Issue URL

import { DomainError } from '../../common/errors';

export class GitHubIssueUrl {
  private constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidGitHubIssueUrlError(value);
    }
  }

  private isValid(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === 'https:' &&
        parsed.hostname === 'github.com' &&
        !!parsed.pathname.match(/\/issues\/\d+$/)
      );
    } catch {
      return false;
    }
  }

  static create(url: string): GitHubIssueUrl {
    return new GitHubIssueUrl(url);
  }

  static createOrNull(url: string | undefined | null): GitHubIssueUrl | null {
    if (!url) return null;
    try {
      return new GitHubIssueUrl(url);
    } catch {
      return null;
    }
  }

  equals(other: GitHubIssueUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class InvalidGitHubIssueUrlError extends DomainError {
  readonly code = 'INVALID_GITHUB_ISSUE_URL' as const;

  constructor(url: string) {
    super(`Invalid GitHub Issue URL: ${url}`);
  }
}
