// GraphQL GenerationMember Type

import { GenerationMember } from '@/domain/generation-member/generation-member.domain';
import { GqlMember } from './member.type';

export class GqlGenerationMember {
  id: number;
  generationId: number;
  joinedAt: string;
  member?: GqlMember;

  constructor(genMember: GenerationMember, member?: GqlMember) {
    this.id = genMember.id.value;
    this.generationId = genMember.generationId.value;
    this.joinedAt = genMember.joinedAt.toISOString();
    this.member = member;
  }
}
