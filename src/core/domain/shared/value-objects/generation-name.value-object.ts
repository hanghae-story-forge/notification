import { DomainException } from '../exceptions/domain-exception';

export class InvalidGenerationNameError extends DomainException {
  readonly code = 'INVALID_GENERATION_NAME' as const;
}

export class GenerationName {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidGenerationNameError('Generation name cannot be empty');
    }
    if (value.trim().length > 100) {
      throw new InvalidGenerationNameError(
        'Generation name cannot exceed 100 characters'
      );
    }
    this.value = value.trim();
  }

  equals(other: GenerationName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
