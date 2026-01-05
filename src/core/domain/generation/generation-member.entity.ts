import { GenerationId } from '../shared/types';

export class GenerationMember {
  constructor(
    public readonly id: number,
    public readonly generationId: GenerationId,
    public readonly memberId: number,
    private readonly _joinedAt: Date
  ) {}

  get joinedAt(): Date {
    return this._joinedAt;
  }

  equals(other: GenerationMember): boolean {
    return (
      this.generationId.equals(other.generationId) &&
      this.memberId === other.memberId
    );
  }
}
