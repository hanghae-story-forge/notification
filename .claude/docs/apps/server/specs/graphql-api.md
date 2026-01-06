# GraphQL API (Pylon Framework)

- **Status**: As-Is (현재 구현)
- **App Scope**: apps/server
- **Scope**: GraphQL API 스키마 및 리졸버
- **Based on**:
  - Facts:
    - [.claude/docs/apps/server/facts/presentation/graphql.md](../../facts/presentation/graphql.md)
    - [.claude/docs/apps/server/facts/application/queries.md](../../facts/application/queries.md)
    - [.claude/docs/apps/server/facts/application/commands.md](../../facts/application/commands.md)
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## 개요 (Overview)

- **목적**: Code-First GraphQL API로 유연한 데이터 조회 및 변경 제공
- **범위**:
  - **In-Scope**:
    - 8개 Queries (members, member, generations, generation, activeGeneration, cycles, cycle, activeCycle, cycleStatus)
    - 4개 Mutations (addMember, addGeneration, addCycle, addSubmission)
    - Pylon Framework 기반 Code-First 스키마 자동 생성
    - TypeScript 타입 안전성 보장
  - **Out-of-Scope**:
    - Subscriptions (실시간 업데이트) - 추후 추가 가능
    - 인증/인가 Middleware - 현재 미구현
    - Pagination/Cursor - 현재 전체 목록 반환
- **비즈니스 가치**:
  - **타입 안전성**: TypeScript와 GraphQL 스키마 간 자동 동기화
  - **유연성**: 클라이언트가 필요한 필드만 선택 가능 (Over-fetching 방지)
  - **개발 생산성**: Code-First로 별도 스키마 파일 관리 불필요
  - **확장성**: 쉽게 새로운 Query/Mutation 추가 가능
- **관련 앱**: apps/server (백엔드 API 서버)

## 핵심 기능 (Core Features)

### 1. Queries (8개)

- **members**: 전체 회원 목록 조회
- **member**: GitHub 사용자명으로 회원 조회
- **generations**: 전체 기수 목록 조회
- **generation**: ID로 기수 조회
- **activeGeneration**: 활성화된 기수 조회
- **cycles**: 사이클 목록 조회 (generationId로 필터링 가능)
- **cycle**: ID로 사이클 조회
- **activeCycle**: 현재 진행 중인 사이클 조회 (dongueldonguel 조직)
- **cycleStatus**: 사이클별 제출 현황 조회

### 2. Mutations (4개)

- **addMember**: 회원 추가 (GitHub username, name, discordId)
- **addGeneration**: 기수 생성 (name, startedAt, organizationSlug)
- **addCycle**: 사이클 생성 (generationId, week, startDate, endDate, githubIssueUrl, organizationSlug)
- **addSubmission**: 제출 추가 (현재 미구현 - GitHub webhook 사용 권장)

### 3. GraphQL Types (4개)

- **GqlMember**: id, github, discordId, name, createdAt
- **GqlGeneration**: id, name, startedAt, isActive, createdAt
- **GqlCycle**: id, generationId, week, startDate, endDate, githubIssueUrl, createdAt
- **GqlCycleStatus**: cycle, summary, submitted, notSubmitted

### 4. Code-First Approach

- **설명**: TypeScript 클래스 정의로부터 GraphQL 스키마 자동 생성
- **주요 규칙**:
  - Pylon Framework의 @Query, @Mutation 데코레이터 사용
  - TypeScript 타입으로 GraphQL 타입 자동 생성
  - 별도 SDL (Schema Definition Language) 파일 불필요
  - 리졸버 메서드가 CQRS Command/Query Handler 실행

## 기술 사양 (Technical Specifications)

### 아키텍처 개요

**Pylon Framework**:
- TypeScript 기반 GraphQL Framework
- Code-First 접근 (TypeScript 클래스 → GraphQL 스키마)
- Dependency Injection 지원
- 자타입 리졸버 (Auto-resolver) 기능

**계층 구조**:
```
Client (GraphQL Playground, Discord Bot)
  ↓
Pylon GraphQL Service (Presentation Layer)
  ↓
CQRS Command/Query Handlers (Application Layer)
  ↓
Domain Entities/Repositories (Domain Layer)
  ↓
Drizzle ORM Repositories (Infrastructure Layer)
  ↓
PostgreSQL
```

### 의존성

**Apps**:
- 없음 (단일 앱 구조)

**Packages**:
- 없음

**Libraries**:
- `pylon` - GraphQL framework
- `@hono/zod-validator` - Input validation
- `drizzle-orm` - ORM

**Env Vars**:
- `DATABASE_URL` - PostgreSQL connection string

### 구현 접근

**Pylon Service**:
- `apps/server/src/presentation/graphql/pylon.service.ts`
- @Controller() 데코레이터로 정의
- @Query, @Mutation 데코레이터로 GraphQL 엔드포인트 정의
- Constructor에서 CQRS Handlers 주입

**Resolver Logic**:
```typescript
@Query()
members() {
  return this.getAllMembersQuery.execute(); // GqlMember[]
}

@Query()
member(@Arg('github') github: string) {
  return this.getMemberByGithubQuery.execute(github); // GqlMember | null
}

@Mutation()
addMember(@Arg('github') github: string, @Arg('name') name: string, @Arg('discordId', { nullable: true }) discordId?: string) {
  return this.createMemberCommand.execute({ github, name, discordId }); // GqlMember
}
```

**Type Mapping**:
- Domain Entity → GqlType (Data Transfer Object)
- 예: Member → GqlMember, Generation → GqlGeneration

### 관측/운영

- **Logging**: TBD (현재 구현되지 않음)
- **Metrics**: TBD (Prometheus/Grafana integration 필요)
  - Query 응답 시간 (P50, P95, P99)
  - Mutation 실행 시간
  - Error Rate
- **Tracing**: TBD (OpenTelemetry integration 필요)

### 실패 모드/대응

- **Query 실패**: GraphQL Errors 배열로 반환 (Partial success 지원)
- **Mutation 실패**: GraphQL Errors로 반환 (Transaction rollback)
- **Validation 실패**: Zod validation error → GraphQL error
- **Database 연결 실패**: 500 Internal Server Error

## 데이터 구조 (Data Structure)

### 모델/스키마

**GraphQL Schema (Auto-generated from TypeScript)**:

```graphql
type GqlMember {
  id: Int!
  github: String
  discordId: String!
  name: String!
  createdAt: DateTime!
}

type GqlGeneration {
  id: Int!
  name: String!
  startedAt: DateTime!
  isActive: Boolean!
  createdAt: DateTime!
}

type GqlCycle {
  id: Int!
  generationId: Int!
  week: Int!
  startDate: DateTime!
  endDate: DateTime!
  githubIssueUrl: String!
  createdAt: DateTime!
}

type GqlCycleStatus {
  cycle: GqlCycle!
  summary: GqlCycleStatusSummary!
  submitted: [GqlSubmission!]!
  notSubmitted: [GqlMember!]!
}

type GqlCycleStatusSummary {
  totalMembers: Int!
  submittedCount: Int!
  notSubmittedCount: Int!
  submissionRate: Float!
}

type GqlSubmission {
  member: GqlMember!
  url: String!
  submittedAt: DateTime!
}
```

### 데이터 흐름

**Query 흐름**:
```
Client (GraphQL Query)
  ↓
Pylon GraphQL Service (Resolver)
  ↓
Query Handler (Application Layer)
  ↓
Repository (Domain Layer)
  ↓
Drizzle ORM (Infrastructure Layer)
  ↓
PostgreSQL
  ↓
Response (Domain Entity → GqlType)
  ↓
Client (JSON)
```

**Mutation 흐름**:
```
Client (GraphQL Mutation)
  ↓
Pylon GraphQL Service (Resolver)
  ↓
Command Handler (Application Layer)
  ↓
Domain Entity (Business Logic)
  ↓
Repository (Domain Layer)
  ↓
Drizzle ORM (Infrastructure Layer)
  ↓
PostgreSQL (Transaction)
  ↓
Response (Domain Entity → GqlType)
  ↓
Domain Event 발행
  ↓
Client (JSON)
```

### 검증/제약

**Input Validation**:
- Zod schema로 입력 검증 (TBD - 현재 미구현)
- TypeScript 타입으로 컴파일 타임 검증

**Business Rules**:
- GitHub Username 중복 불가 (addMember)
- 활성화된 Generation은 하나만 존재 가능 (addGeneration)
- 동일한 주차의 Cycle은 중복 불가 (addCycle)
- GitHub Comment ID 중복 불가 (RecordSubmissionCommand)

## API 명세 (API Specifications)

### GraphQL Queries

#### members

- **Purpose**: 전체 회원 목록 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L234-L239)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetMembers {
    members {
      id
      github
      discordId
      name
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetMembersResponse {
    members: Array<{
      id: number;
      github: string | null;
      discordId: string;
      name: string;
      createdAt: Date;
    }>;
  }
  ```
- **Errors**: None
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#members)

#### member

- **Purpose**: GitHub 사용자명으로 회원 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L241-L246)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetMember($github: String!) {
    member(github: $github) {
      id
      github
      discordId
      name
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetMemberResponse {
    member: {
      id: number;
      github: string | null;
      discordId: string;
      name: string;
      createdAt: Date;
    } | null;
  }
  ```
- **Errors**:
  - `400`: Invalid github format
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#member)

#### generations

- **Purpose**: 전체 기수 목록 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L248-L253)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetGenerations {
    generations {
      id
      name
      startedAt
      isActive
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetGenerationsResponse {
    generations: Array<{
      id: number;
      name: string;
      startedAt: Date;
      isActive: boolean;
      createdAt: Date;
    }>;
  }
  ```
- **Errors**: None
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#generations)

#### generation

- **Purpose**: ID로 기수 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L255-L260)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetGeneration($id: Int!) {
    generation(id: $id) {
      id
      name
      startedAt
      isActive
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetGenerationResponse {
    generation: {
      id: number;
      name: string;
      startedAt: Date;
      isActive: boolean;
      createdAt: Date;
    } | null;
  }
  ```
- **Errors**:
  - `400`: Invalid id format
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#generation)

#### activeGeneration

- **Purpose**: 활성화된 기수 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L262-L267)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetActiveGeneration {
    activeGeneration {
      id
      name
      startedAt
      isActive
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetActiveGenerationResponse {
    activeGeneration: {
      id: number;
      name: string;
      startedAt: Date;
      isActive: boolean;
      createdAt: Date;
    } | null;
  }
  ```
- **Errors**: None
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#activegeneration)

#### cycles

- **Purpose**: 사이클 목록 조회 (generationId로 필터링 가능)
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L269-L274)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetCycles($generationId: Int) {
    cycles(generationId: $generationId) {
      id
      generationId
      week
      startDate
      endDate
      githubIssueUrl
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetCyclesResponse {
    cycles: Array<{
      id: number;
      generationId: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
      createdAt: Date;
    }>;
  }
  ```
- **Errors**: None
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#cycles)

#### cycle

- **Purpose**: ID로 사이클 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L276-L281)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetCycle($id: Int!) {
    cycle(id: $id) {
      id
      generationId
      week
      startDate
      endDate
      githubIssueUrl
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetCycleResponse {
    cycle: {
      id: number;
      generationId: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
      createdAt: Date;
    } | null;
  }
  ```
- **Errors**:
  - `400`: Invalid id format
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#cycle)

#### activeCycle

- **Purpose**: 현재 진행 중인 사이클 조회 (dongueldonguel 조직)
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L283-L289)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetActiveCycle {
    activeCycle {
      id
      generationId
      week
      startDate
      endDate
      githubIssueUrl
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetActiveCycleResponse {
    activeCycle: {
      id: number;
      generationId: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
      createdAt: Date;
    } | null;
  }
  ```
- **Note**: 현재 하드코딩된 조직 slug 사용 ('dongueldonguel')
- **Errors**: None
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#activecycle)

#### cycleStatus

- **Purpose**: 사이클별 제출 현황 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L291-L299)
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetCycleStatus($cycleId: Int!, $organizationSlug: String!) {
    cycleStatus(cycleId: $cycleId, organizationSlug: $organizationSlug) {
      cycle {
        id
        week
        startDate
        endDate
      }
      summary {
        totalMembers
        submittedCount
        notSubmittedCount
        submissionRate
      }
      submitted {
        member {
          name
        }
        url
        submittedAt
      }
      notSubmitted {
        name
      }
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetCycleStatusResponse {
    cycleStatus: {
      cycle: {
        id: number;
        week: number;
        startDate: Date;
        endDate: Date;
      };
      summary: {
        totalMembers: number;
        submittedCount: number;
        notSubmittedCount: number;
        submissionRate: number;
      };
      submitted: Array<{
        member: { name: string };
        url: string;
        submittedAt: Date;
      }>;
      notSubmitted: Array<{ name: string }>;
    };
  }
  ```
- **Errors**:
  - `400`: Invalid cycleId format
  - `404`: Cycle not found
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#cyclestatus)

### GraphQL Mutations

#### addMember

- **Purpose**: 회원 추가
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L318-L325)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  mutation AddMember($github: String!, $name: String!, $discordId: String) {
    addMember(github: $github, name: $name, discordId: $discordId) {
      id
      github
      discordId
      name
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface AddMemberResponse {
    addMember: {
      id: number;
      github: string | null;
      discordId: string;
      name: string;
      createdAt: Date;
    };
  }
  ```
- **Errors**:
  - `400`: Invalid input (github, name format)
  - `409`: GitHub username already exists
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#addmember)

#### addGeneration

- **Purpose**: 기수 생성
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L327-L335)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  mutation AddGeneration($name: String!, $startedAt: String!, $organizationSlug: String!) {
    addGeneration(name: $name, startedAt: $startedAt, organizationSlug: $organizationSlug) {
      id
      name
      startedAt
      isActive
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface AddGenerationResponse {
    addGeneration: {
      id: number;
      name: string;
      startedAt: Date;
      isActive: boolean;
      createdAt: Date;
    };
  }
  ```
- **Errors**:
  - `400`: Invalid input (name length, startedAt format)
  - `409`: Organization already has an active generation
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#addgeneration)

#### addCycle

- **Purpose**: 사이클 생성
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L337-L349)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  mutation AddCycle(
    $generationId: Int!
    $week: Int!
    $startDate: String!
    $endDate: String!
    $githubIssueUrl: String!
    $organizationSlug: String!
  ) {
    addCycle(
      generationId: $generationId
      week: $week
      startDate: $startDate
      endDate: $endDate
      githubIssueUrl: $githubIssueUrl
      organizationSlug: $organizationSlug
    ) {
      id
      generationId
      week
      startDate
      endDate
      githubIssueUrl
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface AddCycleResponse {
    addCycle: {
      id: number;
      generationId: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
      createdAt: Date;
    };
  }
  ```
- **Errors**:
  - `400`: Invalid input (week negative, dates invalid)
  - `404`: Generation not found
  - `409`: Cycle with same week already exists
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#addcycle)

#### addSubmission

- **Purpose**: 제출 추가 (현재 미구현)
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L351-L356)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  mutation AddSubmission {
    addSubmission {
      # ...
    }
  }
  ```
- **Response**:
  ```typescript
  // 현재 에러 메시지만 반환
  interface AddSubmissionResponse {
    addSubmission: string; // "Please use the GitHub webhook endpoint instead"
  }
  ```
- **Errors**: None (에러 메시지 반환)
- **Note**: GitHub username과 githubIssueUrl이 필요하므로 webhook endpoint 사용 권장
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#addsubmission)

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오

#### 1. 개발자가 전체 회원 목록 조회

1. 개발자가 GraphQL Playground 접속
2. Query 작성
   ```graphql
   query GetMembers {
     members {
       id
       github
       name
       discordId
     }
   }
   ```
3. Pylon GraphQL Service가 Query 수신
4. getAllMembersQuery.execute() 실행
5. MemberRepository.findAll()로 DB 조회
6. Member Entity → GqlMember 변환
7. JSON 응답 반환
   ```json
   {
     "data": {
       "members": [
         { "id": 1, "github": "john", "name": "John Doe", "discordId": "123" },
         { "id": 2, "github": "jane", "name": "Jane Smith", "discordId": "456" }
       ]
     }
   }
   ```

#### 2. Discord Bot이 현재 사이클 조회

1. Discord Bot이 GraphQL API로 HTTP 요청
2. Query 작성
   ```graphql
   query GetActiveCycle {
     activeCycle {
       id
       week
       startDate
       endDate
       githubIssueUrl
     }
   }
   ```
3. Pylon GraphQL Service가 Query 수신
4. getCycleStatusQuery.getCurrentCycle('dongueldonguel') 실행
5. 조직 존재 확인
6. 활성화된 Generation 찾기
7. 진행 중인 Cycle 찾기
8. Cycle Entity → GqlCycle 변환
9. JSON 응답 반환
   ```json
   {
     "data": {
       "activeCycle": {
         "id": 42,
         "week": 1,
         "startDate": "2025-01-04T00:00:00Z",
         "endDate": "2025-01-11T23:59:59Z",
         "githubIssueUrl": "https://github.com/..."
       }
     }
   }
   ```
10. Discord Bot이 응답을 Discord Embed로 변환하여 전송

#### 3. 개발자가 새로운 회원 추가

1. 개발자가 GraphQL Playground 접속
2. Mutation 작성
   ```graphql
   mutation AddMember {
     addMember(github: "newuser", name: "New User", discordId: "789") {
       id
       github
       name
       discordId
       createdAt
     }
   }
   ```
3. Pylon GraphQL Service가 Mutation 수신
4. createMemberCommand.execute({ github: "newuser", name: "New User", discordId: "789" }) 실행
5. MemberRepository.findByGithub()로 중복 검사
6. Member Entity 생성
7. MemberRepository.save()로 DB 저장
8. Member Entity → GqlMember 변환
9. JSON 응답 반환
   ```json
   {
     "data": {
       "addMember": {
         "id": 3,
         "github": "newuser",
         "name": "New User",
         "discordId": "789",
         "createdAt": "2025-01-07T14:30:00Z"
       }
     }
   }
   ```

#### 4. Discord Bot이 제출 현황 조회

1. Discord Bot이 GraphQL API로 HTTP 요청
2. Query 작성
   ```graphql
   query GetCycleStatus($cycleId: Int!, $organizationSlug: String!) {
     cycleStatus(cycleId: $cycleId, organizationSlug: $organizationSlug) {
       cycle { id week }
      summary { totalMembers submittedCount notSubmittedCount submissionRate }
      submitted { member { name } url submittedAt }
      notSubmitted { name }
    }
  }
   ```
3. Pylon GraphQL Service가 Query 수신
4. getCycleStatusQuery.getCycleStatus(42, 'dongueldonguel') 실행
5. 사이클 존재 확인
6. 조직의 활성 멤버 목록 조회
7. 제출자 목록 조회
8. 미제출자 목록 계산
9. JSON 응답 반환
   ```json
   {
     "data": {
       "cycleStatus": {
         "cycle": { "id": 42, "week": 1 },
         "summary": {
           "totalMembers": 8,
           "submittedCount": 5,
           "notSubmittedCount": 3,
           "submissionRate": 62.5
         },
         "submitted": [
           { "member": { "name": "John Doe" }, "url": "...", "submittedAt": "..." },
           ...
         ],
         "notSubmitted": [
           { "name": "Jane Smith" },
           ...
         ]
       }
     }
   }
   ```
10. Discord Bot이 응답을 Discord Embed로 변환하여 전송

### 실패/예외 시나리오

#### 1. 존재하지 않는 회원 조회

1. 개발자가 GraphQL Playground에서 Query 작성
   ```graphql
   query GetMember {
     member(github: "nonexistent") {
       id
       name
     }
   }
   ```
2. Pylon GraphQL Service가 Query 수신
3. getMemberByGithubQuery.execute("nonexistent") 실행
4. MemberRepository.findByGithub()로 조회 실패
5. null 반환
6. JSON 응답 반환
   ```json
   {
     "data": {
       "member": null
     }
   }
   ```

#### 2. 중복 GitHub username으로 회원 추가 시도

1. 개발자가 GraphQL Playground에서 Mutation 작성
   ```graphql
   mutation AddMember {
     addMember(github: "john", name: "John Doe", discordId: "999") {
       id
     }
   }
   ```
2. Pylon GraphQL Service가 Mutation 수신
3. createMemberCommand.execute() 실행
4. MemberRepository.findByGithub()로 중복 검사
5. 중복 발견 (GitHub username "john" already exists)
6. 에러 발생
7. JSON 응답 반환 (Partial success)
   ```json
   {
     "data": null,
     "errors": [
       {
         "message": "Member with github 'john' already exists",
         "path": ["addMember"]
       }
     ]
   }
   ```

#### 3. 잘못된 형식의 입력

1. 개발자가 GraphQL Playground에서 Mutation 작성 (잘못된 형식)
   ```graphql
   mutation AddGeneration {
     addGeneration(name: "", startedAt: "invalid-date", organizationSlug: "test") {
       id
     }
   }
   ```
2. Pylon GraphQL Service가 Mutation 수신
3. Zod validation 실패 (name이 빈 문자열, startedAt이 날짜 형식 아님)
4. 에러 발생
5. JSON 응답 반환 (Partial success)
   ```json
   {
     "data": null,
     "errors": [
       {
         "message": "Validation error",
         "extensions": {
           "issues": [
             { "path": ["name"], "message": "Name cannot be empty" },
             { "path": ["startedAt"], "message": "Invalid date format" }
           ]
         }
       }
     ]
   }
   ```

## 제약사항 및 고려사항 (Constraints)

### 보안

- **인증/인가 미구현**: 현재 모든 Query/Mutation 공개 (TBD)
- **Input Validation**: Zod schema로 입력 검증 권장 (현재 미구현)
- **Rate Limiting**: TBD (현재 무제한)
- **Query Depth Limit**: TBD (무한 루프 방지)

### 성능

- **N+1 Query Problem**: DataLoader로 해결 권장 (현재 미구현)
- **Pagination**: 현재 전체 목록 반환 (Cursor-based Pagination 추가 권장)
- **Caching**:
  - Query 결과 캐싱 권장 (Redis, TTL: 5분)
  - GraphQL persisted queries 사용 권장
- **Query Complexity**: TBD (복잡도 제한으로 DoS 방지)

### 배포

- **GraphQL Playground**: 개발 환경에서만 노출 권장
- **Schema Registry**: TBD (스키마 버전 관리)
- **Apollo Federation**: TBD (다중 서비스 통합)

### 롤백

- **Schema Versioning**: 기존 필드는 deprecated로 표시하고 제거하지 않음
- **Feature Flag**: 새로운 Query/Mutation을 Feature Flag로 관리
- **Backward Compatibility**: Breaking changes는 버전을 올려서 제공

### 호환성

- **GraphQL Spec**: GraphQL 최신 스펙 준수 (June 2018+)
- **Client Libraries**: Apollo Client, Relay, urql 등 모든 클라이언트 지원
- **Introspection**: 개발 환경에서만 활성화 권장 (보안)

### 앱 간 통신

- 없음 (단일 앱 구조)
- **Note**: Discord Bot이 외부 클라이언트로 GraphQL API 호출

## 향후 확장 가능성 (Future Expansion)

### 1. Subscriptions (실시간 업데이트)

- **현재**: Polling으로 데이터 변경 확인
- **추후**: WebSocket 기반 실시간 업데이트
- **구현**:
  - submissionCreated Event → Subscription으로 클라이언트에 푸시
  - cycleUpdated Event → 실시간 사이클 현황 업데이트
- **예시**:
  ```graphql
  subscription OnSubmissionCreated($cycleId: Int!) {
    submissionCreated(cycleId: $cycleId) {
      submission { member { name } url }
      cycleStatus { summary { submittedCount } }
    }
  }
  ```

### 2. Pagination/Cursor

- **현재**: 전체 목록 반환 (성능 이슈)
- **추후**: Cursor-based Pagination
- **구현**:
  - Relay Cursor Connections Spec 준수
  - edges, nodes, pageInfo 필드 추가
- **예시**:
  ```graphql
  query GetMembers($first: Int, $after: String) {
    members(first: $first, after: $after) {
      edges { cursor node { id name } }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
  ```

### 3. DataLoader (N+1 Query 해결)

- **현재**: N+1 Query 문제 (예: cycleStatus.submitted에서 N번의 member 조회)
- **추후**: DataLoader로 Batch & Cache
- **구현**:
  - dataloader 패키지 사용
  - Request 단위로 Batch & Cache
- **효과**: Query 수 50개 → 5개로 감소

### 4. 인증/인가 미들웨어

- **현재**: 모든 Query/Mutation 공개
- **추후**: Discord OAuth 2.0으로 인증
- **구현**:
  - @UseGuards(AuthGuard) 데코레이터
  - Context에서 Discord User ID 조회
  - 조직별 활성 멤버인지 확인

### 5. GraphQL Persisted Queries

- **현재**: 매번 Query를 전체 전송
- **추후**: Query를 Hash로 저장하여 전송량 감소
- **구현**:
  - APQ (Automatic Persisted Queries)
  - GET /graphql?hash=sha256(query) 로 요청
- **효과**: 전송량 90% 감소

### 6. Federated Schema (Apollo Federation)

- **현재**: 단일 GraphQL Server
- **추후**: 여러 서비스의 GraphQL Schema 통합
- **구현**:
  - users 서비스, submissions 서비스 등으로 분리
  - Apollo Gateway로 통합
- **효과**: 서비스 독립적 배포 가능

## 추가로 필요 정보 (Needed Data/Decisions)

### TBD: 인증/인가 구현

- **질문**: GraphQL API에 인증 미들웨어를 어떻게 구현할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Discord OAuth 2.0 (권장)
  2. JWT Token
  3. API Key (관리자 전용)

### TBD: Rate Limiting 전략

- **질문**: GraphQL API에 Rate Limiting을 어떻게 구현할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. IP 기반 Rate Limiting
  2. User 기반 Rate Limiting (인증 후)
  3. Query Complexity 기반 Rate Limiting

### TBD: Pagination 전략

- **질문**: Pagination을 어떻게 구현할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Offset-based (LIMIT/OFFSET) - 간단하지만 비효율
  2. Cursor-based (Relay Spec) - 권장 (실시간 데이터에 적합)
  3. Keyset-based (ID 기반) - 성능 좋음

### TBD: DataLoader 도입

- **질문**: N+1 Query 문제를 DataLoader로 해결할 것인가?
- **오너**: Backend Team
- **제안**:
  - datalofer 패키지 도입
  - Member, Generation, Cycle Entity에 DataLoader 적용
  - Request 단위로 Batch & Cache

### TBD: GraphQL Playground 환경

- **질문**: GraphQL Playground를 어디서 노출할 것인가?
- **오너**: DevOps Team
- **옵션**:
  1. 개발 환경에서만 노출
  2. 프로덕션에서도 노출 (인증 필요)
  3. Apollo Studio로 대체

### TBD: Query Complexity 제한

- **질문**: 복잡한 Query로 DoS 공격 방지를 어떻게 할 것인가?
- **오너**: Backend Team
- **제안**:
  - graphql-complexity 패키지 사용
  - 최대 복잡도: 1000
  - 초과 시 400 Bad Request 반환
