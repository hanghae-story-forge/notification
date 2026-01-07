// GraphQL Generation Type

import { Generation } from '@/domain/generation/generation.domain';
import { GqlCycle } from './cycle.type';
import { GqlOrganization } from './organization.type';

export class GqlGeneration {
  id: number;
  name: string;
  startedAt: string;
  isActive: boolean;
  createdAt: string;
  organization?: GqlOrganization;
  cycles?: GqlCycle[];

  constructor(
    generation: Generation,
    organization?: GqlOrganization,
    cycles?: GqlCycle[]
  ) {
    this.id = generation.id.value;
    this.name = generation.name;
    this.startedAt = generation.startedAt.toISOString();
    this.isActive = generation.isActive;
    this.createdAt = generation.createdAt.toISOString();
    this.organization = organization;
    this.cycles = cycles;
  }
}
