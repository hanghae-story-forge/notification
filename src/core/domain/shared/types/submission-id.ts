import { EntityId } from './entity-id';

export class SubmissionId extends EntityId {
  static create(value: number = 0): SubmissionId {
    return new SubmissionId(value);
  }
}
