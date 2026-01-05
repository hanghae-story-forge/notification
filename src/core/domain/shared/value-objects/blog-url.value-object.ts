import { DomainException } from '../exceptions/domain-exception';

export class InvalidBlogUrlError extends DomainException {
  readonly code = 'INVALID_BLOG_URL' as const;
}

export class BlogUrl {
  readonly value: string;

  constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  private validate(value: string): void {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new InvalidBlogUrlError('URL must use HTTP or HTTPS protocol');
      }
    } catch {
      throw new InvalidBlogUrlError('Invalid URL format');
    }
  }

  equals(other: BlogUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
