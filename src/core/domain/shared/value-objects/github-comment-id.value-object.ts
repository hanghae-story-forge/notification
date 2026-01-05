import { DomainException } from '../exceptions/domain-exception';

export class InvalidGitHubCommentIdError extends DomainException {
  readonly code = 'INVALID_GITHUB_COMMENT_ID' as const;
}

export class GitHubCommentId {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidGitHubCommentIdError('GitHub comment ID cannot be empty');
    }
    this.value = value;
  }

  equals(other: GitHubCommentId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
