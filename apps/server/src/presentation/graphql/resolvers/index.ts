// Resolvers Index - 모든 도메인 리졸버를 합쳐서 내보내기

import { memberQueries, memberMutations } from './member.resolver';
import { generationQueries, generationMutations } from './generation.resolver';
import { cycleQueries, cycleMutations } from './cycle.resolver';
import {
  organizationQueries,
  organizationMutations,
} from './organization.resolver';
import {
  organizationMemberQueries,
  organizationMemberMutations,
} from './organization-member.resolver';

// ========================================
// Query Resolvers 합치기
// ========================================

export const queryResolvers = {
  ...memberQueries,
  ...generationQueries,
  ...cycleQueries,
  ...organizationQueries,
  ...organizationMemberQueries,
};

// ========================================
// Mutation Resolvers 합치기
// ========================================

export const mutationResolvers = {
  ...memberMutations,
  ...generationMutations,
  ...cycleMutations,
  ...organizationMutations,
  ...organizationMemberMutations,
};
