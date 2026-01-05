import { DomainException } from '../exceptions/domain-exception';

export class InvalidGitHubIssueUrlError extends DomainException {
  readonly code = 'INVALID_GITHUB_ISSUE_URL' as const;
}

export class GitHubIssueUrl {
  readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  private validate(value: string): void {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new InvalidGitHubIssueUrlError('URL must use HTTP or HTTPS protocol');
      }
      if (!url.hostname.endsWith('github.com')) {
        throw new InvalidGitHubIssueUrlError('URL must be a GitHub URL');
      }
    } catch {
      throw new InvalidGitHubIssueUrlError('Invalid URL format');
    }
  }

  equals(other: GitHubIssueUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  getOwnerAndRepo(): { owner: string; repo: string } | null {
    try {
      const url = new URL(this.value);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        return { owner: pathParts[0], repo: pathParts[1] };
      }
      return null;
    } catch {
      return null;
    }
  }
}
