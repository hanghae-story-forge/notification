import { EntityId } from './entity-id';

export class CycleId extends EntityId {
  static create(value: number = 0): CycleId {
    return new CycleId(value);
  }
}
