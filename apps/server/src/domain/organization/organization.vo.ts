// Organization Value Objects

import { InvalidValueError } from '../common/errors';

// 조직 이름 Value Object
export class OrganizationName {
  private constructor(public readonly value: string) {
    if (value.trim().length === 0) {
      throw new InvalidValueError(
        'Organization name',
        value,
        'Name cannot be empty'
      );
    }
    if (value.length > 100) {
      throw new InvalidValueError(
        'Organization name',
        value,
        'Name cannot exceed 100 characters'
      );
    }
  }

  static create(value: string): OrganizationName {
    return new OrganizationName(value.trim());
  }

  equals(other: OrganizationName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// 조직 Slug Value Object (URL-friendly identifier)
export class OrganizationSlug {
  private constructor(public readonly value: string) {
    // Slug: lowercase, alphanumeric, hyphens only, 2-50 chars
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!slugRegex.test(value) || value.length < 2 || value.length > 50) {
      throw new InvalidValueError(
        'Organization slug',
        value,
        'Slug must be 2-50 characters, lowercase alphanumeric with hyphens'
      );
    }
  }

  static create(value: string): OrganizationSlug {
    // Auto-convert to slug format
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, '') // Remove special chars except Korean
      .replace(/[\s_]+/g, '-') // Spaces/underscores to hyphens
      .replace(/-+/g, '-') // Multiple hyphens to single
      .replace(/[^a-z0-9-]/g, ''); // Remove remaining non-ASCII

    return new OrganizationSlug(slug);
  }

  equals(other: OrganizationSlug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// Discord Webhook URL Value Object
export class DiscordWebhookUrl {
  private constructor(public readonly value: string | null) {
    if (value && !this.isValidDiscordWebhookUrl(value)) {
      throw new InvalidValueError(
        'Discord webhook URL',
        value,
        'Invalid Discord webhook URL format'
      );
    }
  }

  private isValidDiscordWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === 'discord.com' &&
        parsed.pathname.startsWith('/api/webhooks/')
      );
    } catch {
      return false;
    }
  }

  static create(value: string | null | undefined): DiscordWebhookUrl {
    return new DiscordWebhookUrl(value ?? null);
  }

  equals(other: DiscordWebhookUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value ?? '';
  }

  get valueOrNull(): string | null {
    return this.value;
  }
}
