# Presentation Layer - GraphQL API

---
metadata:
  layer: Presentation
  component: GraphQL
  library: Apollo Server
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

GraphQL API는 Apollo Server를 사용하여 GraphQL 쿼리와 뮤테이션을 제공합니다. 단일 엔드포인트 `/graphql`에서 모든 요청을 처리합니다.

## Schema

- **Location**: `src/presentation/graphql/schema.ts` (L3-L102)
- **Purpose**: GraphQL 타입 정의 (graphql-tag)

### Types

#### Member

```graphql
type Member {
  id: Int!
  github: String!
  discordId: String
  name: String!
  createdAt: String!
}
```

#### Generation

```graphql
type Generation {
  id: Int!
  name: String!
  startedAt: String!
  isActive: Boolean!
  createdAt: String!
}
```

#### Cycle

```graphql
type Cycle {
  id: Int!
  generationId: Int!
  week: Int!
  startDate: String!
  endDate: String!
  githubIssueUrl: String
  createdAt: String!
}
```

#### Submission

```graphql
type Submission {
  id: Int!
  cycleId: Int!
  memberId: Int!
  url: String!
  submittedAt: String!
  githubCommentId: String
  member: Member!
}
```

#### CycleSummary

```graphql
type CycleSummary {
  total: Int!
  submitted: Int!
  notSubmitted: Int!
}
```

#### CycleStatus

```graphql
type CycleStatus {
  cycle: Cycle!
  summary: CycleSummary!
  submitted: [MemberSubmission!]!
  notSubmitted: [Member!]!
}
```

#### MemberSubmission

```graphql
type MemberSubmission {
  member: Member!
  url: String!
  submittedAt: String!
}
```

### Queries

```graphql
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
```

### Mutations

```graphql
type Mutation {
  # 멤버 추가
  addMember(
    github: String!
    name: String!
    discordId: String
  ): Member!

  # 기수 생성
  addGeneration(
    name: String!
    startedAt: String!
  ): Generation!

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
```

## Resolvers

- **Location**: `src/presentation/graphql/resolvers.ts`
- **Purpose**: Query/Mutation resolver 구현

### Query Resolvers

#### members()

전체 회원 목록 조회

```typescript
members: async () => {
  const members = await memberRepo.findAll();
  return members.map(m => m.toDTO());
}
```

#### member(github)

GitHub 사용자명으로 회원 조회

```typescript
member: async (_: any, { github }: { github: string }) => {
  const member = await memberRepo.findByGithubUsername(github);
  return member?.toDTO();
}
```

#### generations()

전체 기수 목록 조회

```typescript
generations: async () => {
  const generations = await generationRepo.findAll();
  return generations.map(g => g.toDTO());
}
```

#### generation(id)

기수 ID로 조회

```typescript
generation: async (_: any, { id }: { id: number }) => {
  const generation = await generationRepo.findById(GenerationId.create(id));
  return generation?.toDTO();
}
```

#### activeGeneration()

활성화된 기수 조회

```typescript
activeGeneration: async () => {
  const generation = await generationRepo.findActive();
  return generation?.toDTO();
}
```

#### cycles(generationId)

기수별 사이클 목록 조회

```typescript
cycles: async (_: any, { generationId }: { generationId?: number }) => {
  if (generationId) {
    const cycles = await cycleRepo.findByGeneration(generationId);
    return cycles.map(c => c.toDTO());
  }
  return [];
}
```

#### cycle(id)

사이클 ID로 조회

```typescript
cycle: async (_: any, { id }: { id: number }) => {
  const cycle = await cycleRepo.findById(CycleId.create(id));
  return cycle?.toDTO();
}
```

#### activeCycle()

활성화된 사이클 조회

```typescript
activeCycle: async () => {
  const generation = await generationRepo.findActive();
  if (!generation) return null;

  const cycles = await cycleRepo.findActiveCyclesByGeneration(generation.id.value);
  return cycles[0]?.toDTO();
}
```

#### cycleStatus(cycleId)

사이클 제출 현황 조회

```typescript
cycleStatus: async (_: any, { cycleId }: { cycleId: number }) => {
  const result = await getCycleStatusQuery.getCycleStatus(cycleId);
  return {
    cycle: result.cycle,
    summary: result.summary,
    submitted: result.submitted.map(s => ({
      member: members.find(m => m.github === s.github),
      url: s.url,
      submittedAt: s.submittedAt
    })),
    notSubmitted: result.notSubmitted.map(n => ({
      ...members.find(m => m.github === n.github)
    }))
  };
}
```

### Mutation Resolvers

#### addMember(github, name, discordId)

회원 추가

```typescript
addMember: async (_: any, { github, name, discordId }: CreateMemberRequest) => {
  const result = await createMemberCommand.execute({
    githubUsername: github,
    name,
    discordId
  });
  return result.member.toDTO();
}
```

#### addGeneration(name, startedAt)

기수 생성

```typescript
addGeneration: async (_: any, { name, startedAt }: CreateGenerationRequest) => {
  const result = await createGenerationCommand.execute({
    name,
    startedAt: new Date(startedAt),
    isActive: false
  });
  return result.generation.toDTO();
}
```

#### addCycle(...)

사이클 생성

```typescript
addCycle: async (_: any, args: CreateCycleRequest) => {
  const result = await createCycleCommand.execute({
    week: args.week,
    startDate: new Date(args.startDate),
    endDate: new Date(args.endDate),
    githubIssueUrl: args.githubIssueUrl
  });
  return result.cycle.toDTO();
}
```

#### addSubmission(...)

제출 추가

```typescript
addSubmission: async (_: any, args: CreateSubmissionRequest) => {
  const member = await memberRepo.findById(MemberId.create(args.memberId));
  const cycle = await cycleRepo.findById(CycleId.create(args.cycleId));

  if (!member || !cycle) {
    throw new Error('Member or Cycle not found');
  }

  const result = await recordSubmissionCommand.execute({
    githubUsername: member.githubUsername.value,
    blogUrl: args.url,
    githubCommentId: args.githubCommentId || String(Date.now()),
    githubIssueUrl: cycle.githubIssueUrl?.value || ''
  });
  return result.submission.toDTO();
}
```

## 엔드포인트

- **Path**: `/graphql`
- **Methods**: GET, POST
- **Location**: `src/index.ts` (L66-L92)

### 요청 형식

#### GET

```
GET /graphql?query={members{id,name}}
```

#### POST

```json
POST /graphql
Content-Type: application/json

{
  "query": "query { members { id name } }",
  "variables": {},
  "operationName": null
}
```

### 응답 형식

```json
{
  "data": {
    "members": [
      {
        "id": 1,
        "name": "John Doe"
      }
    ]
  }
}
```

## Apollo Server 설정

- **Location**: `src/index.ts` (L59-L63)
- **Purpose**: Apollo Server 인스턴스 생성

```typescript
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // 개발용 스키마 탐색 허용
});
```

**Introspection**: 개발 환경에서 스키마 탐색 가능 (운영 환경에서는 비권장)

## 사용 예시

### 전체 회원 조회

```graphql
query {
  members {
    id
    github
    name
    discordId
  }
}
```

### 활성화된 기수와 사이클 조회

```graphql
query {
  activeGeneration {
    id
    name
    isActive
  }
  activeCycle {
    id
    week
    startDate
    endDate
  }
}
```

### 제출 현황 조회

```graphql
query {
  cycleStatus(cycleId: 1) {
    cycle {
      id
      week
    }
    summary {
      total
      submitted
      notSubmitted
    }
    submitted {
      member {
        name
        github
      }
      url
      submittedAt
    }
    notSubmitted {
      name
      github
    }
  }
}
```

### 회원 추가

```graphql
mutation {
  addMember(
    github: "john-doe"
    name: "John Doe"
    discordId: "123456789012345678"
  ) {
    id
    github
    name
  }
}
```

### 사이클 생성

```graphql
mutation {
  addCycle(
    generationId: 1
    week: 1
    startDate: "2026-01-01T00:00:00Z"
    endDate: "2026-01-08T23:59:59Z"
    githubIssueUrl: "https://github.com/org/repo/issues/1"
  ) {
    id
    week
    startDate
    endDate
  }
}
```

## 향후 확장

1. **DataLoader**: N+1 쿼리 문제 해결
2. **Subscriptions**: 실시간 제출 알림
3. **Apollo Federation**: 여러 서버로 스키마 분할
4. **Auth**: 인증/인가 미들웨어
5. **Rate Limiting**: 쿼리 복잡도 기반 레이트 리미팅
6. **Caching**: Response 캐싱 (Apollo Cache)
