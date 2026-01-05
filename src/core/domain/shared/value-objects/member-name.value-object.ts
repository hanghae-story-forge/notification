import { DomainException } from '../exceptions/domain-exception';

export class InvalidMemberNameError extends DomainException {
  readonly code = 'INVALID_MEMBER_NAME' as const;
}

export class MemberName {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidMemberNameError('Member name cannot be empty');
    }
    if (value.trim().length > 100) {
      throw new InvalidMemberNameError(
        'Member name cannot exceed 100 characters'
      );
    }
    this.value = value.trim();
  }

  equals(other: MemberName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
