import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Member {
    id: Int!
    github: String!
    discordId: String
    name: String!
    createdAt: String!
  }

  type Generation {
    id: Int!
    name: String!
    startedAt: String!
    isActive: Boolean!
    createdAt: String!
  }

  type Cycle {
    id: Int!
    generationId: Int!
    week: Int!
    startDate: String!
    endDate: String!
    githubIssueUrl: String
    createdAt: String!
  }

  type Submission {
    id: Int!
    cycleId: Int!
    memberId: Int!
    url: String!
    submittedAt: String!
    githubCommentId: String
    member: Member!
  }

  type CycleSummary {
    total: Int!
    submitted: Int!
    notSubmitted: Int!
  }

  type CycleStatus {
    cycle: Cycle!
    summary: CycleSummary!
    submitted: [MemberSubmission!]!
    notSubmitted: [Member!]!
  }

  type MemberSubmission {
    member: Member!
    url: String!
    submittedAt: String!
  }

  type Query {
    # 멤버 조회
    members: [Member!]!
    member(github: String!): Member

    # 기수 조회
    generations: [Generation!]!
    generation(id: Int!): Generation
    activeGeneration: Generation

    # 사이클 조회
    cycles(generationId: Int): [Cycle!]!
    cycle(id: Int!): Cycle
    activeCycle: Cycle

    # 제출 현황
    cycleStatus(cycleId: Int!): CycleStatus!
  }

  type Mutation {
    # 멤버 추가
    addMember(github: String!, name: String!, discordId: String): Member!

    # 기수 생성
    addGeneration(name: String!, startedAt: String!): Generation!

    # 사이클 생성
    addCycle(
      generationId: Int!
      week: Int!
      startDate: String!
      endDate: String!
      githubIssueUrl: String!
    ): Cycle!

    # 제출 추가
    addSubmission(
      cycleId: Int!
      memberId: Int!
      url: String!
      githubCommentId: String
    ): Submission!
  }
`;
