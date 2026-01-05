import { DomainException } from './domain-exception';

export class NotFoundException extends DomainException {
  readonly code = 'NOT_FOUND' as const;

  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message);
  }
}
