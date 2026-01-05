import { EntityId } from './entity-id';

export class GenerationId extends EntityId {
  static create(value: number = 0): GenerationId {
    return new GenerationId(value);
  }
}
