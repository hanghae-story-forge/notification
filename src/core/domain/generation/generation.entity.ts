import { GenerationId, GenerationName } from '../shared';
import { GenerationMember } from './generation-member.entity';

export class Generation {
  private _members: Set<GenerationMember>;

  constructor(
    private readonly _id: GenerationId,
    private readonly _name: GenerationName,
    private readonly _startedAt: Date,
    private _isActive: boolean,
    private readonly _createdAt: Date
  ) {
    this._members = new Set<GenerationMember>();
  }

  get id(): GenerationId {
    return this._id;
  }

  get name(): GenerationName {
    return this._name;
  }

  get startedAt(): Date {
    return this._startedAt;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get members(): Set<GenerationMember> {
    return this._members;
  }

  activate(): void {
    this._isActive = true;
  }

  deactivate(): void {
    this._isActive = false;
  }

  addMember(id: number, memberId: number, joinedAt: Date): GenerationMember {
    const genMember = new GenerationMember(id, this._id, memberId, joinedAt);
    this._members.add(genMember);
    return genMember;
  }

  removeMember(genMember: GenerationMember): void {
    this._members.delete(genMember);
  }

  hasMember(memberId: number): boolean {
    return Array.from(this._members).some((m) => m.memberId === memberId);
  }

  static create(
    name: GenerationName,
    startedAt: Date = new Date()
  ): Generation {
    return new Generation(
      GenerationId.create(),
      name,
      startedAt,
      true,
      new Date()
    );
  }
}
