// Domain Errors - 도메인 에러 정의

// 기반 도메인 에러
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// 리포지토리 에러
export abstract class RepositoryError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends RepositoryError {
  readonly code = 'NOT_FOUND' as const;

  constructor(entity: string, id?: number | string) {
    super(
      id
        ? `${entity} with ID ${id} not found`
        : `${entity} not found`
    );
  }
}

export class DuplicateError extends RepositoryError {
  readonly code = 'DUPLICATE' as const;

  constructor(entity: string, field: string, value: unknown) {
    super(`${entity} with ${field}=${String(value)} already exists`);
  }
}

export class ConstraintViolationError extends RepositoryError {
  readonly code = 'CONSTRAINT_VIOLATION' as const;

  constructor(message: string) {
    super(message);
  }
}

// 애플리케이션 에러 (Use Case 레벨)
export abstract class ApplicationError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ApplicationError {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly field?: string;
  readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(message);
    this.field = field;
    this.value = value;
  }
}

export class UnauthorizedError extends ApplicationError {
  readonly code = 'UNAUTHORIZED' as const;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ConflictError extends ApplicationError {
  readonly code = 'CONFLICT' as const;

  constructor(message: string) {
    super(message);
  }
}
