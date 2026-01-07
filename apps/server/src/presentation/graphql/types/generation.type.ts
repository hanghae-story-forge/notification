// GraphQL Generation Type

import { Generation } from '@/domain/generation/generation.domain';

export class GqlGeneration {
  id: number;
  name: string;
  startedAt: string;
  isActive: boolean;
  createdAt: string;

  constructor(generation: Generation) {
    this.id = generation.id.value;
    this.name = generation.name;
    this.startedAt = generation.startedAt.toISOString();
    this.isActive = generation.isActive;
    this.createdAt = generation.createdAt.toISOString();
  }
}
