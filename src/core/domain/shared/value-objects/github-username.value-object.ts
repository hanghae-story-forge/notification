import { DomainException } from '../exceptions/domain-exception';

export class InvalidGitHubUsernameError extends DomainException {
  readonly code = 'INVALID_GITHUB_USERNAME' as const;
}

export class GitHubUsername {
  readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new InvalidGitHubUsernameError('GitHub username cannot be empty');
    }
    // GitHub username rules: 1-39 chars, alphanumeric and hyphens only, cannot start/end with hyphen
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}[a-zA-Z0-9]$/.test(value)) {
      throw new InvalidGitHubUsernameError('Invalid GitHub username format');
    }
  }

  equals(other: GitHubUsername): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
