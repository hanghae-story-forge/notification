import { EntityId } from './entity-id';

export class MemberId extends EntityId {
  static create(value: number = 0): MemberId {
    return new MemberId(value);
  }
}
