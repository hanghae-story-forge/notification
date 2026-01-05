import { DomainException } from '../exceptions/domain-exception';

export class InvalidDiscordIdError extends DomainException {
  readonly code = 'INVALID_DISCORD_ID' as const;
}

export class DiscordId {
  readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new InvalidDiscordIdError('Discord ID cannot be empty');
    }
    // Discord snowflake IDs are 17-19 digit numbers
    if (!/^\d{17,19}$/.test(value)) {
      throw new InvalidDiscordIdError('Invalid Discord ID format');
    }
  }

  equals(other: DiscordId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
