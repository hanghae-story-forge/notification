// Member Value Objects

import { InvalidValueError } from '../common/errors';

// 회원 이름 Value Object
export class MemberName {
  private constructor(public readonly value: string) {
    if (value.trim().length === 0) {
      throw new InvalidValueError('Member name', value, 'Name cannot be empty');
    }
    if (value.length > 50) {
      throw new InvalidValueError(
        'Member name',
        value,
        'Name cannot exceed 50 characters'
      );
    }
  }

  static create(value: string): MemberName {
    return new MemberName(value.trim());
  }

  equals(other: MemberName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// GitHub 사용자명 Value Object
export class GithubUsername {
  private constructor(public readonly value: string) {
    // GitHub username: 1-39 characters, alphanumeric and hyphens only
    const githubUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!githubUsernameRegex.test(value) || value.length > 39) {
      throw new InvalidValueError(
        'GitHub username',
        value,
        'Invalid GitHub username format'
      );
    }
  }

  static create(value: string): GithubUsername {
    return new GithubUsername(value);
  }

  equals(other: GithubUsername): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// Discord ID Value Object
export class DiscordId {
  private constructor(public readonly value: string) {
    // Discord snowflake ID: 17-19 digit number
    const discordIdRegex = /^\d{17,19}$/;
    if (!discordIdRegex.test(value)) {
      throw new InvalidValueError(
        'Discord ID',
        value,
        'Invalid Discord ID format (must be 17-19 digits)'
      );
    }
  }

  static create(value: string): DiscordId {
    return new DiscordId(value);
  }

  static createOrNull(value: string | null | undefined): DiscordId | null {
    if (!value) return null;
    try {
      return DiscordId.create(value);
    } catch {
      return null;
    }
  }

  equals(other: DiscordId | null): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
