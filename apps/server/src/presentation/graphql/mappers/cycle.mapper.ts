// Cycle Mapper

import { Cycle } from '@/domain/cycle/cycle.domain';
import {
  GqlCycle,
  GqlMember,
  GqlCycleStatus,
  GqlCycleSummary,
  GqlMemberSubmission,
} from '../types';
import type { SubmittedMember, NotSubmittedMember } from '@/application';
import { createGqlMember } from './member.mapper';

export const domainToGraphqlCycle = (cycle: Cycle): GqlCycle => {
  return new GqlCycle(cycle);
};

export const createGqlCycle = (data: {
  id: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl?: string | null;
}): GqlCycle => {
  const gqlCycle = new GqlCycle({
    id: { value: data.id },
    generationId: 0,
    week: { value: data.week },
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    githubIssueUrl: data.githubIssueUrl
      ? { value: data.githubIssueUrl }
      : undefined,
    createdAt: new Date(data.startDate),
  } as unknown as Cycle);
  return gqlCycle;
};

export const submittedMemberToGraphql = (
  data: SubmittedMember
): GqlMemberSubmission => {
  const submission = new GqlMemberSubmission();
  submission.member = createGqlMember(
    0,
    data.github,
    data.name,
    data.submittedAt
  );
  submission.url = data.url;
  submission.submittedAt = data.submittedAt;
  return submission;
};

export const notSubmittedMemberToGraphql = (
  data: NotSubmittedMember
): GqlMember => {
  return createGqlMember(0, data.github, data.name, new Date().toISOString());
};

export const toGqlCycleStatus = (
  status: {
    cycle: {
      id: number;
      week: number;
      startDate: string;
      endDate: string;
      githubIssueUrl?: string | null;
    };
    summary: { total: number; submitted: number; notSubmitted: number };
    submitted: SubmittedMember[];
    notSubmitted: NotSubmittedMember[];
  },
  createGqlCycle: (data: {
    id: number;
    week: number;
    startDate: string;
    endDate: string;
    githubIssueUrl?: string | null;
  }) => GqlCycle
): GqlCycleStatus => {
  const cycleStatus = new GqlCycleStatus();
  cycleStatus.cycle = createGqlCycle(status.cycle);

  const summary = new GqlCycleSummary();
  summary.total = status.summary.total;
  summary.submitted = status.summary.submitted;
  summary.notSubmitted = status.summary.notSubmitted;
  cycleStatus.summary = summary;

  cycleStatus.submitted = status.submitted.map(submittedMemberToGraphql);
  cycleStatus.notSubmitted = status.notSubmitted.map(
    notSubmittedMemberToGraphql
  );

  return cycleStatus;
};
