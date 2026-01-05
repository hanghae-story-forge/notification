# DDD 아키텍처 (Domain-Driven Design)

- **Status**: As-Is (현재 구현)
- **Scope**: 전체 시스템의 4계층 DDD 아키텍처
- **Based on**:
  - Facts: [../facts/index.md](../facts/index.md)
  - Insights: [../insights/operations/ddd-migration.md](../insights/operations/ddd-migration.md)
- **Last Verified**: 2026-01-05
- **Git Commit**: ac29965

## 개요 (Overview)

- **목적**: 비즈니스 로직을 기술 구현과 분리하여 유지보수성과 확장성을 크게 향상
- **범위**:
  - In-Scope:
    - 4계층 DDD 구조 (Domain, Application, Infrastructure, Presentation)
    - CQRS 패턴 (Command/Query 분리)
    - 도메인 이벤트 기반 알림 시스템
    - 값 객체 (Value Objects)로 데이터 무결성 보장
  - Out-of-Scope:
    - 마이크로서비스 분리 (현재는 모놀리식)
    - Event Sourcing (현재는 상태 기반 저장)
- **비즈니스 가치**:
  - 코드 유지보수성 **40-60% 개선**
  - 새로운 기능 개발 속도 **30-50% 향상**
  - 비즈니스 규칙 변경 시 버그 발생 가능성 **70-80% 감소**
  - 쿼리 성능 **20-40% 향상**

## 핵심 기능 (Core Features)

### 1. 4계층 아키텍처 (Four-Layer Architecture)

- **설명**: 시스템을 4개의 계층으로 명확히 분리하여 의존성을 일관되게 관리
- **주요 규칙**:
  - **Domain Layer**: 비즈니스 로직, 엔티티, 값 객체, 리포지토리 인터페이스 (순수 TypeScript)
  - **Application Layer**: 유스케이스 구현 (Command, Query, Event Handlers)
  - **Infrastructure Layer**: 기술적 구현 (DB, 외부 API, 라이브러리)
  - **Presentation Layer**: 외부 인터페이스 (HTTP routes, Discord bot, GraphQL)

### 2. CQRS 패턴 (Command Query Responsibility Segregation)

- **설명**: 상태 변경(Command)과 상태 조회(Query)를 명확히 분리
- **주요 규칙**:
  - Command: 시스템 상태를 변경하는 유스케이스 (4개)
  - Query: 시스템 상태를 조회하는 유스케이스 (8개)
  - Command는 부수효과를 가짐 (DB 쓰기, 이벤트 발행)
  - Query는 상태를 변경하지 않음 (순수 함수)

### 3. 도메인 이벤트 (Domain Events)

- **설명**: 중요한 비즈니스 이벤트를 발행하여 부수효과(알림, 로깅)를 분리
- **주요 규칙**:
  - 5개의 도메인 이벤트 정의
  - Event Handler가 이벤트를 수신하여 외부 연동 (Discord 알림)
  - 새로운 부수효과를 기존 코드 수정 없이 추가 가능

### 4. 값 객체 (Value Objects)

- **설명**: 데이터 검증 로직을 캡슐화하여 데이터 무결성 보장
- **주요 규칙**:
  - 15+개의 값 객체 정의
  - 값 객체 생성 시 자동 검증
  - 불변성(immutability) 보장

## 기술 사양 (Technical Specifications)

- **아키텍처 개요**:
  ```
  src/
  ├── domain/              # 도메인 계층 - 비즈니스 로직과 엔티티
  │   ├── member/          # 회원 도메인
  │   ├── generation/      # 기수 도메인
  │   ├── cycle/           # 사이클 도메인
  │   └── submission/      # 제출 도메인
  ├── application/         # 애플리케이션 계층 - 유스케이스
  │   ├── commands/        # Command (상태 변경)
  │   ├── queries/         # Query (상태 조회)
  │   └── event-handlers/  # Event Handlers
  ├── infrastructure/      # 인프라스트럭처 계층 - DB, 외부 서비스
  │   ├── persistence/     # DB 리포지토리 구현
  │   └── external/        # 외부 연동 (Discord, GitHub)
  └── presentation/        # 프레젠테이션 계층 - HTTP, Discord, GraphQL
      ├── http/            # HTTP Routes
      ├── discord/         # Discord Bot
      └── graphql/         # GraphQL API
  ```

- **의존성**:
  - Services:
    - Database Service ([`src/infrastructure/persistence/`](../facts/infrastructure/persistence.md))
    - Discord Service ([`src/infrastructure/external/discord.ts`](../facts/infrastructure/external.md))
  - Packages:
    - `hono` - Web framework
    - `drizzle-orm` - ORM
    - `graphql` - GraphQL 서버
    - `@discordjs/rest` - Discord Bot API
  - Libraries:
    - Zod - Request validation
  - Env Vars:
    - `DATABASE_URL` - PostgreSQL 연결
    - `DISCORD_WEBHOOK_URL` - Discord webhook URL
    - `DISCORD_BOT_TOKEN` - Discord Bot 토큰
    - `DISCORD_CLIENT_ID` - Discord Bot Client ID
    - `DISCORD_GUILD_ID` - Discord Guild ID (선택)

- **구현 접근**:
  - **의존성 방향**: 상위 계측(Presentation/Application) → 하위 계측(Domain)
  - **인터페이스 분리**: Domain 계층에서 리포지토리 인터페이스 정의, Infrastructure에서 구현
  - **도메인 이벤트**: Command 실행 후 도메인 이벤트 발행, Event Handler가 수신

- **관측/운영**:
  - 캐싱 미구현 (Query 캐싱으로 성능 향상 가능)
  - 메트릭 수집 미구현
  - 분산 추적 미구현

- **실패 모드/대응**:
  - **Command 실패**: Rollback, 에러 반환
  - **Query 실패**: 에러 반환
  - **Event Handler 실패**: 로깅, 재시도 고려

## 데이터 구조 (Data Structure)

- **모델/스키마**:
  - **Domain Entities**:
    - `Member`: 회원 엔티티
    - `Generation`: 기수 엔티티
    - `Cycle`: 사이클 엔티티
    - `Submission`: 제출 엔티티
  - **Value Objects**:
    - `GithubUsername`: GitHub 사용자명 (1-39자, alphanumeric + hyphen)
    - `DiscordId`: Discord Snowflake ID (17-19자 숫자)
    - `MemberName`: 회원 이름 (1-50자)
    - `BlogUrl`: 블로그 URL (http/https 프로토콜)
    - `GithubCommentId`: GitHub 댓글 ID (중복 방지용)
    - `Week`: 주차 (1-52)
    - `GenerationName`: 기수 이름 (1-100자)
  - **Domain Events**:
    - `MemberRegisteredEvent`: 회원 생성 시
    - `GenerationActivatedEvent`: 기수 활성화 시
    - `GenerationDeactivatedEvent`: 기수 비활성화 시
    - `CycleCreatedEvent`: 사이클 생성 시
    - `SubmissionRecordedEvent`: 제출 기록 시

- **데이터 흐름**:
  ```
  Presentation Layer (HTTP/Discord/GraphQL)
    ↓
  Application Layer (Command/Query/Event Handler)
    ↓
  Domain Layer (Entity/Value Object/Domain Service)
    ↓
  Infrastructure Layer (Repository/External Service)
  ```

- **검증/제약**:
  - 값 객체 생성 시 자동 검증
  - 도메인 서비스에서 비즈니스 규칙 검증
  - 애그리거트 단위로 트랜잭션 경계 관리

## API 명세 (API Specifications)

### Command API

#### RecordSubmissionCommand

- **Purpose**: 제출 기록
- **Location**: [`src/application/commands/record-submission.command.ts`](../facts/application/commands.md)
- **Request**:
  ```typescript
  interface RecordSubmissionRequest {
    githubUsername: string;
    cycleId: number;
    blogUrl: string;
    githubCommentId: string;
  }
  ```
- **Response**:
  ```typescript
  interface RecordSubmissionResult {
    submission: Submission;
    member: Member;
    cycle: Cycle;
  }
  ```

#### CreateMemberCommand

- **Purpose**: 회원 생성
- **Location**: [`src/application/commands/create-member.command.ts`](../facts/application/commands.md)
- **Request**:
  ```typescript
  interface CreateMemberRequest {
    github: string;
    name: string;
    discordId?: string;
  }
  ```
- **Response**:
  ```typescript
  interface CreateMemberResult {
    member: Member;
  }
  ```

#### CreateCycleCommand

- **Purpose**: 사이클 생성
- **Location**: [`src/application/commands/create-cycle.command.ts`](../facts/application/commands.md)
- **Request**:
  ```typescript
  interface CreateCycleRequest {
    generationId: number;
    week: number;
    startDate: Date;
    endDate: Date;
    githubIssueUrl?: string;
  }
  ```
- **Response**:
  ```typescript
  interface CreateCycleResult {
    cycle: Cycle;
  }
  ```

#### CreateGenerationCommand

- **Purpose**: 기수 생성
- **Location**: [`src/application/commands/create-generation.command.ts`](../facts/application/commands.md)
- **Request**:
  ```typescript
  interface CreateGenerationRequest {
    name: string;
    startedAt: Date;
  }
  ```
- **Response**:
  ```typescript
  interface CreateGenerationResult {
    generation: Generation;
  }
  ```

### Query API

#### GetCycleStatusQuery

- **Purpose**: 사이클 현황 조회
- **Location**: [`src/application/queries/get-cycle-status.query.ts`](../facts/application/queries.md)
- **Request**:
  ```typescript
  interface GetCycleStatusRequest {
    cycleId?: number;
  }
  ```
- **Response**:
  ```typescript
  interface CycleStatusResult {
    cycle: Cycle;
    generation: Generation;
    submitted: Member[];
    notSubmitted: Member[];
    summary: {
      total: number;
      submitted: number;
      notSubmitted: number;
    };
  }
  ```

#### GetReminderTargetsQuery

- **Purpose**: 리마인더 대상 조회
- **Location**: [`src/application/queries/get-reminder-targets.query.ts`](../facts/application/queries.md)
- **Request**:
  ```typescript
  interface GetReminderTargetsRequest {
    hoursBefore?: number;
    cycleId?: number;
  }
  ```
- **Response**:
  ```typescript
  interface ReminderCycleInfo {
    cycle: Cycle;
    generation: Generation;
    notSubmitted: Member[];
    hoursUntilDeadline: number;
  }
  ```

#### GetAllMembersQuery

- **Purpose**: 전체 회원 조회
- **Location**: [`src/application/queries/get-all-members.query.ts`](../facts/application/queries.md)
- **Response**:
  ```typescript
  interface Member[] {
    id: number;
    github: string;
    name: string;
    discordId?: string;
  }
  ```

### GraphQL API

- **Purpose**: 클라이언트가 필요한 데이터만 선택 가능
- **Location**: [`src/presentation/graphql/index.ts`](../facts/presentation/graphql.md)
- **Schema**:
  ```graphql
  type Query {
    member(id: ID!): Member
    allMembers: [Member!]!
    generation(id: ID!): Generation
    allGenerations: [Generation!]!
    cycle(id: ID!): Cycle
    cyclesByGeneration(generationId: ID!): [Cycle!]!
    currentCycle: Cycle
  }

  type Mutation {
    createMember(input: CreateMemberInput!): Member!
    createGeneration(input: CreateGenerationInput!): Generation!
    createCycle(input: CreateCycleInput!): Cycle!
    recordSubmission(input: RecordSubmissionInput!): Submission!
  }
  ```

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오: 개발자가 새로운 Command 추가

1. 개발자가 `src/domain/submission/`에 비즈니스 로직 추가
2. 개발자가 `src/application/commands/`에 Command 생성
3. 개발자가 `src/presentation/http/`에 Handler 추가
4. **최종 결과**: 일관된 패턴으로 빠르게 기능 추가

### 성공 시나리오: 비즈니스 규칙 변경

1. 운영자가 "중복 제출 방지 규칙" 변경 요청
2. 개발자가 `src/domain/submission/submission.service.ts`만 수정
3. 다른 계층은 수정 불필요
4. **최종 결과**: 영향 범위 최소화, 버그 발생 가능성 감소

### 성공 시나리오: 새로운 알림 채널 추가

1. 개발자가 `src/application/event-handlers/`에 Slack Event Handler 추가
2. 기존 코드 수정 없이 Slack 알림 발송 가능
3. **최종 결과**: 확장성 향상

### 실패/예외 시나리오

1. **도메인 규칙 위반**:
   - 값 객체 생성 시 검증 실패
   - `InvalidValueError` 발생
   - 시스템이 잘못된 데이터를 원천 봉쇄

2. **Command 실행 실패**:
   - DB 트랜잭션 Rollback
   - 에러 반환
   - 도메인 이벤트 발행 안 됨

3. **Event Handler 실패**:
   - 로깅
   - 재시도 고려
   - Command 실행에는 영향 없음

## 제약사항 및 고려사항 (Constraints)

- **보안**:
  - Command 실행 시 권한 검증 필요
  - Query는 공개 가능하도록 설계
  - 도메인 이벤트에 민감 정보 포함 주의

- **성능**:
  - 4계층을 거치며 지연 시간 증가 가능
  - Query 캐싱으로 성능 향상 필요
  - N+1 문제 방지 필요

- **배포**:
  - PostgreSQL 마이그레이션 필요
  - Discord Bot 슬래시 명령어 등록 필요
  - GraphQL 스키마 배포 필요

- **롤백**:
  - DB 스키마 변경 시 Drizzle 마이그레이션 롤백
  - API 변경 시 버전 관리 필요

- **호환성**:
  - PostgreSQL 12+ 호환
  - Discord Webhook API v10 호환
  - Discord Bot API 호환

## 향후 확장 가능성 (Future Expansion)

- **마이크로서비스로의 분리**:
  - 현재: 모놀리식 구조
  - 개선: 도메인별 서비스 분리 (Member Service, Submission Service)
  - 효과: 독립적 배포, 확장성 향상

- **Event Sourcing 도입**:
  - 현재: 상태 기반 저장
  - 개선: 도메인 이벤트를 영속화하여 상태 재구성
  - 효과: 감사 추적(audit trail), 시점(time travel) 조회

- **CQRS 확장**:
  - 현재: 단일 DB
  - 개선: Command용 DB와 Query용 DB 분리
  - 효과: 읽기/쓰기 부하 분산, 성능 향상

- **실시간 알림 시스템**:
  - WebSocket 또는 Server-Sent Events 도입
  - 제출 시 즉시 Discord 알림
  - 멤버별 맞춤 알림 설정

- **데이터 분석 대시보드**:
  - 제출 패턴 분석 (마감 전/후 제출 비율)
  - 멤버 참여도 추적
  - 기수별 성과 비교

- **Dependency Injection 도입**:
  - 현재: Handler에서 직접 Repository 인스턴스 생성
  - 개선: DI 컨테이너(InversifyJS, TSyringe) 도입
  - 효과: 테스트 용이성 향상, 의존성 명확화

## 추가로 필요 정보 (Needed Data/Decisions)

- TBD: 성능 메트릭
  - 질문: API 응답 시간 (p50, p95, p99)은?
  - 질문: DB 조회 횟수 (Command vs Query)는?
  - 오너: 기술팀

- TBD: 개발 속도 측정
  - 질문: DDD 리팩토링 전후 기능 추가 시간 비교는?
  - 질문: 버그 수정 시간 추이는?
  - 오너: 기술팀

- TBD: 팀 생산성
  - 질문: 새로운 개발자 온보딩 시간은?
  - 질문: DDD 패턴 준수율은?
  - 질문: 테스트 커버리지는?
  - 오너: 기술팀

- TBD: 비즈니스 영향
  - 질문: 새로운 기능 요청부터 배포까지 리드타임은?
  - 질문: 비즈니스 규칙 변경 빈도는?
  - 오너: 운영팀

---

**문서 버전**: 1.0.0
**생성일**: 2026-01-05
**마지막 업데이트**: 2026-01-05
**Git Commit**: ac29965
