// GraphQL Cycle Types

import { Cycle } from '@/domain/cycle/cycle.domain';
import { GqlMember } from './member.type';
import { GqlGeneration } from './generation.type';

export class GqlCycle {
  id: number;
  generationId: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  createdAt: string;
  generation?: GqlGeneration;

  constructor(cycle: Cycle, generation?: GqlGeneration) {
    this.id = cycle.id.value;
    this.generationId = cycle.generationId;
    this.week = cycle.week.value;
    this.startDate = cycle.startDate.toISOString();
    this.endDate = cycle.endDate.toISOString();
    this.githubIssueUrl = cycle.githubIssueUrl?.value ?? null;
    this.createdAt = cycle.createdAt.toISOString();
    this.generation = generation;
  }
}

export class GqlCycleSummary {
  total!: number;
  submitted!: number;
  notSubmitted!: number;
}

export class GqlMemberSubmission {
  member!: GqlMember;
  url!: string;
  submittedAt!: string;
}

export class GqlCycleStatus {
  cycle!: GqlCycle;
  summary!: GqlCycleSummary;
  submitted!: GqlMemberSubmission[];
  notSubmitted!: GqlMember[];
}
