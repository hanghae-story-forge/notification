// Pylon GraphQL Service - Code-First Approach
// Pylon은 TypeScript 정의로부터 GraphQL 스키마를 자동 생성합니다

import { queryResolvers, mutationResolvers } from './resolvers';

// ========================================
// GraphQL API Definition (Pylon)
// ========================================

export const graphql = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
};
