# 멀티 테넌트 아키텍처 (Multi-Tenant Architecture)

- **Status**: As-Is (현재 구현)
- **App Scope**: apps/server
- **Scope**: 전체 아키텍처 및 데이터 모델
- **Based on**:
  - Facts:
    - [.claude/docs/apps/server/facts/domain/organization.md](../../facts/domain/organization.md)
    - [.claude/docs/apps/server/facts/domain/organization-member.md](../../facts/domain/organization-member.md)
    - [.claude/docs/apps/server/facts/database/schema.md](../../facts/database/schema.md)
  - Insights:
    - [.claude/docs/apps/server/insights/impact/multi-tenant-architecture.md](../../insights/impact/multi-tenant-architecture.md)
    - [.claude/docs/apps/server/insights/operations/organization-management.md](../../insights/operations/organization-management.md)
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## 개요 (Overview)

- **목적**: 단일 인스턴스에서 여러 글쓰기 모임(조직)을 독립적으로 운영할 수 있는 멀티 테넌트 시스템 제공
- **범위**:
  - **In-Scope**:
    - 조직(Organization) 도메인 모델 및 리포지토리
    - 조직원(OrganizationMember) 연결 엔티티 및 역할 기반 접근 제어 (RBAC)
    - 데이터베이스 스키마 변경 (organizations, organization_members 테이블)
    - 조직별 Discord 알림 격리
    - 멀티 조직 제출 권한 검증
  - **Out-of-Scope**:
    - 조직별 커스텀 도메인 (추후 고려)
    - 조직간 데이터 공유 기능
    - 조직 간 이관 (Migration) 기능
- **비즈니스 가치**:
  - **인프라 비용 절감**: 단일 인스턴스로 N개 조직 운영 (10개 조직 기준 월 $180 절감)
  - **확장성**: 수평적 확장(Scale Out) 가능, 이론적으로 무제한 조직 운영
  - **프라이버시**: 조직별 데이터 격리로 보안 강화 및 GDPR/CCPA 준수 용이
  - **수익화 잠재력**: 각 조직을 독립적인 SaaS 서비스로 제공 가능
- **관련 앱**: apps/server (백엔드 API 서버)

## 핵심 기능 (Core Features)

### 1. 조직 (Organization) 엔티티

- **설명**: 스터디 그룹을 나타내는 최상위 애그리거트 루트
- **주요 규칙**:
  - 조직 이름은 1-100자, 빈 문자열 불가
  - Slug는 URL 치환적, 소문자/알파벳/숫자/하이픈만 허용 (2-50자)
  - 한글 입력 시 자동으로 영문 하이픈 형식으로 변환
  - Slug는 전역적으로 고유 (UNIQUE 제약)
  - Discord 웹훅 URL은 선택적이며, `discord.com` 호스트네임 검증
  - 활성화/비활성화 상태 관리 (activate/deactivate 메서드)

### 2. 조직원 (OrganizationMember) 연결 엔티티

- **설명**: 조직과 회원의 다대다 관계를 나타내는 연결 엔티티
- **주요 규칙**:
  - 역할(Role): OWNER, ADMIN, MEMBER (계층적 권한)
  - 상태(Status): PENDING → APPROVED/REJECTED/INACTIVE (상태 전이)
  - PENDING 상태 멤버는 승인 후 APPROVED로 변경
  - OWNER/ADMIN 역할만 멤버 관리 권한 보유
  - 조직별 활성 멤버(APPROVED)만 제출 권한 보유

### 3. 데이터 격리 (Data Isolation)

- **설명**: 조직별 데이터 완전 격리
- **주요 규칙**:
  - Organization → Generation → Cycle → Submission 계층 구조
  - 모든 Generation은 특정 Organization에 소속
  - 모든 Cycle은 특정 Generation에 소속 (간접적으로 Organization에 소속)
  - 제출 시 제출자가 해당 조직의 활성 멤버인지 검증
  - Discord 알림은 조직별 웹훅 URL로 분리

### 4. 역할 기반 접근 제어 (RBAC)

- **설명**: 조직내 역할에 따른 권한 관리
- **주요 규칙**:
  - **OWNER**: 조직 전체 관리, 역할 변경, 조직 비활성화
  - **ADMIN**: 멤버 관리 (승인/거절/역할 변경)
  - **MEMBER**: 제출 및 조회 (기본 권한)
  - 권한 검증은 Command Handler 레벨에서 수행

### 5. GitHub Username 중복 허용

- **설명**: 여러 조직에서 동일한 GitHub username 사용 가능
- **주요 규칙**:
  - members 테이블의 github 컬럼 UNIQUE 제약조건 제거
  - RecordSubmissionCommand는 조직 활성 멤버 확인으로 제출 권한 검증
  - 단일 GitHub username으로 여러 조직에 동시 참여 가능

## 기술 사양 (Technical Specifications)

### 아키텍처 개요

**DDD (Domain-Driven Design) 패턴**:
- **Domain Layer**: Organization, OrganizationMember 엔티티 및 Value Objects
- **Application Layer**: CQRS Command/Query Handlers
- **Infrastructure Layer**: Drizzle ORM Repository 구현체
- **Presentation Layer**: Pylon GraphQL API

**계층 구조**:
```
Presentation (GraphQL)
    ↓
Application (Commands/Queries)
    ↓
Domain (Entities, Value Objects, Repositories)
    ↓
Infrastructure (Drizzle Repositories, PostgreSQL)
```

### 의존성

**Apps**:
- 없음 (단일 앱 구조)

**Packages**:
- 없음

**Libraries**:
- `@hono/zod-validator` - Input validation
- `drizzle-orm` - ORM
- `postgres` - Database client
- `pylon` - GraphQL framework

**Env Vars**:
- `DATABASE_URL` - PostgreSQL connection string
- `DISCORD_WEBHOOK_URL` - Discord webhook URL (조직별로 DB에 저장)

### 구현 접근

**Aggregate Root**:
- Organization이 최상위 애그리거트
- OrganizationMember는 독립적인 엔티티 (Organization 애그리거트에 포함되지 않음)
- Generation, Cycle은 Organization에 종속

**Domain Event**:
- OrganizationCreatedEvent - 조직 생성 시
- OrganizationActivatedEvent - 조직 활성화 시
- OrganizationDeactivatedEvent - 조직 비활성화 시
- OrganizationMemberJoinedEvent - 조직 가입 요청 시
- OrganizationMemberApprovedEvent - 가입 승인 시
- OrganizationMemberRejectedEvent - 가입 거절 시

**Repository Pattern**:
- OrganizationRepository (interface) → DrizzleOrganizationRepository (impl)
- OrganizationMemberRepository (interface) → DrizzleOrganizationMemberRepository (impl)

### 관측/운영

- **Logging**: TBD (현재 구현되지 않음)
- **Metrics**: TBD (Prometheus/Grafana integration 필요)
- **Tracing**: TBD (OpenTelemetry integration 필요)

### 실패 모드/대응

- **Slug 중복**: CreateOrganizationCommand에서 검증 후 에러 반환
- **활성 멤버 아님**: RecordSubmissionCommand에서 ForbiddenError 발생
- **Discord 웹훅 실패**: 에러 로깅하나 제출은 계속 진행 (idempotency 보장)
- **Database connection 실패**: 재시도 로직 필요 (TBD)

## 데이터 구조 (Data Structure)

### 모델/스키마

**organizations 테이블**:
- **Columns**:
  - `id: serial` (PK) - Auto-increment ID
  - `name: text` (UNIQUE, NOT NULL) - 조직 이름
  - `slug: text` (UNIQUE, NOT NULL, INDEXED) - URL 식별자
  - `discord_webhook_url: text` (NULLABLE) - Discord 웹훅 URL
  - `is_active: boolean` (DEFAULT: true) - 활성화 상태
  - `created_at: timestamp` (DEFAULT: NOW()) - 생성 일시
- **Indexes**:
  - `organizations_slug_idx` ON (slug)

**organization_members 테이블**:
- **Columns**:
  - `id: serial` (PK) - Auto-increment ID
  - `organization_id: integer` (FK, NOT NULL) - 조직 ID
  - `member_id: integer` (FK, NOT NULL) - 회원 ID
  - `role: enum` (NOT NULL) - 역할 (OWNER/ADMIN/MEMBER)
  - `status: enum` (NOT NULL, INDEXED) - 상태 (PENDING/APPROVED/REJECTED/INACTIVE)
  - `joined_at: timestamp` (DEFAULT: NOW()) - 가입 일시
  - `updated_at: timestamp` (DEFAULT: NOW()) - 상태 변경 일시
- **Enums**:
  - `organization_role`: OWNER, ADMIN, MEMBER
  - `organization_member_status`: PENDING, APPROVED, REJECTED, INACTIVE
- **Indexes**:
  - `org_members_org_member_idx` ON (organization_id, member_id)
  - `org_members_status_idx` ON (status)

**generations 테이블 (수정됨)**:
- **New Columns**:
  - `organization_id: integer` (FK, NOT NULL, INDEXED) - 조직 ID
- **Foreign Keys**:
  - `organization_id` → `organizations(id)`
- **Indexes**:
  - `generations_org_idx` ON (organization_id)

**members 테이블 (수정됨)**:
- **Changed Columns**:
  - `github: text` (NULLABLE, UNIQUE 제약조건 제거) - GitHub 사용자명

### 데이터 흐름

**조직 생성 흐름**:
```
CreateOrganizationCommand
  1. Slug 중복 검사 (OrganizationRepository.findBySlug)
  2. Organization.create() - 도메인 엔티티 생성
  3. OrganizationRepository.save() - DB 저장
  4. Domain Event 발행 (OrganizationCreatedEvent)
```

**조직 가입 흐름**:
```
JoinOrganizationCommand
  1. 조직 존재 확인 (OrganizationRepository.findBySlug)
  2. 멤버 존재 확인 (MemberRepository.findByDiscordId)
  3. 이미 속해 있는지 확인 (OrganizationMemberRepository.findByOrganizationAndMember)
  4. OrganizationMember.create(PENDING) - 연결 엔티티 생성
  5. OrganizationMemberRepository.save() - DB 저장
  6. Domain Event 발행 (OrganizationMemberJoinedEvent)
```

**제출 권한 검증 흐름**:
```
RecordSubmissionCommand
  1. Cycle으로 Generation 찾기
  2. Generation으로 Organization 찾기
  3. GitHub Username으로 Member 찾기
  4. OrganizationMemberRepository.isActiveMember(organizationId, memberId) - 활성 멤버 확인
  5. 활성 멤버가 아니면 ForbiddenError 발생
  6. Submission 생성 및 저장
  7. Discord 알림 (조직별 웹훅 URL)
```

### 검증/제약

**Value Object Validation**:
- `OrganizationName`: 1-100자, 빈 문자열 불가
- `OrganizationSlug`: 2-50자, 소문자/알파벳/숫자/하이픈만 허용
- `DiscordWebhookUrl`: `discord.com` 호스트네임, `/api/webhooks/` 경로

**Business Rules**:
- Slug 중복 불가
- 조직별 활성화된 Generation은 하나만 존재 가능
- PENDING 상태 멤버만 승인/거절 가능
- OWNER/ADMIN 역할만 멤버 관리 권한 보유
- 활성 멤버(APPROVED)만 제출 권한 보유

## API 명세 (API Specifications)

### GraphQL Queries

#### GetOrganization

- **Purpose**: Slug으로 조직 조회
- **Auth**: None (공개)
- **Request**:
  ```graphql
  query GetOrganization($slug: String!) {
    organization(slug: $slug) {
      id
      name
      slug
      discordWebhookUrl
      isActive
      createdAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetOrganizationResponse {
    organization: {
      id: number;
      name: string;
      slug: string;
      discordWebhookUrl: string | null;
      isActive: boolean;
      createdAt: Date;
    } | null;
  }
  ```
- **Errors**:
  - `400`: Invalid slug format

### GraphQL Mutations

#### CreateOrganization

- **Purpose**: 조직 생성
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      organization {
        id
        name
        slug
        discordWebhookUrl
        isActive
        createdAt
      }
    }
  }
  ```
- **Request Type**:
  ```typescript
  interface CreateOrganizationInput {
    name: string;          // 1-100자
    slug?: string;         // 2-50자, 선택적 (없으면 name에서 자동 생성)
    discordWebhookUrl?: string; // 선택적
  }
  ```
- **Response**:
  ```typescript
  interface CreateOrganizationResponse {
    organization: {
      id: number;
      name: string;
      slug: string;
      discordWebhookUrl: string | null;
      isActive: boolean;
      createdAt: Date;
    };
  }
  ```
- **Errors**:
  - `400`: Invalid input (name length, slug format)
  - `409`: Slug already exists

#### JoinOrganization

- **Purpose**: 조직 가입 요청 (PENDING 상태로 생성)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  mutation JoinOrganization($input: JoinOrganizationInput!) {
    joinOrganization(input: $input) {
      organizationMember {
        id
        organizationId
        memberId
        role
        status
        joinedAt
      }
      organization {
        id
        name
        slug
      }
      member {
        id
        name
        discordId
      }
      isNew
    }
  }
  ```
- **Request Type**:
  ```typescript
  interface JoinOrganizationInput {
    organizationSlug: string;
    memberDiscordId: string;
  }
  ```
- **Response**:
  ```typescript
  interface JoinOrganizationResponse {
    organizationMember: {
      id: number;
      organizationId: number;
      memberId: number;
      role: 'OWNER' | 'ADMIN' | 'MEMBER';
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
      joinedAt: Date;
    };
    organization: {
      id: number;
      name: string;
      slug: string;
    };
    member: {
      id: number;
      name: string;
      discordId: string;
    };
    isNew: boolean; // 새로 생성된 조직원인지
  }
  ```
- **Errors**:
  - `404`: Organization not found
  - `404`: Member not found
  - `409`: Already a member

#### AddMemberToOrganization

- **Purpose**: 관리자가 조직에 멤버 추가
- **Auth**: TBD (OWNER/ADMIN 역할 필요)
- **Request**:
  ```graphql
  mutation AddMemberToOrganization($input: AddMemberToOrganizationInput!) {
    addMemberToOrganization(input: $input) {
      organizationMember {
        id
        organizationId
        memberId
        role
        status
        joinedAt
      }
      organization {
        id
        name
        slug
      }
      member {
        id
        name
        github
      }
    }
  }
  ```
- **Request Type**:
  ```typescript
  interface AddMemberToOrganizationInput {
    organizationSlug: string;
    memberId: number;
    role?: 'OWNER' | 'ADMIN' | 'MEMBER'; // 기본값: MEMBER
  }
  ```
- **Response**:
  ```typescript
  interface AddMemberToOrganizationResponse {
    organizationMember: {
      id: number;
      organizationId: number;
      memberId: number;
      role: 'OWNER' | 'ADMIN' | 'MEMBER';
      status: 'PENDING';
      joinedAt: Date;
    };
    organization: {
      id: number;
      name: string;
      slug: string;
    };
    member: {
      id: number;
      name: string;
      github: string | null;
    };
  }
  ```
- **Errors**:
  - `403`: Forbidden (OWNER/ADMIN 역할 필요)
  - `404`: Organization not found
  - `404`: Member not found
  - `409`: Already a member

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오

#### 1. 새로운 조직 생성

1. 운영자가 GraphQL mutation으로 조직 생성 요청
   ```graphql
   mutation {
     createOrganization(input: {
       name: "똥글똥글"
       slug: "dongueldonguel"
       discordWebhookUrl: "https://discord.com/api/webhooks/..."
     }) {
       organization { id name slug }
     }
   }
   ```
2. 시스템이 Slug 중복 검사 (DB 조회)
3. 조직 엔티티 생성 및 DB 저장
4. OrganizationCreatedEvent 발행
5. 생성된 조직 정보 반환

#### 2. 멤버가 조직에 가입 요청

1. 멤버가 Discord Bot 명령어로 가입 요청
   ```
   /join-org dongueldonguel
   ```
2. Bot이 JoinOrganizationCommand 실행
3. 시스템이 조직 존재 확인
4. 시스템이 멤버 존재 확인 (Discord ID로)
5. 이미 속해 있는지 확인
6. PENDING 상태로 조직원 생성
7. OrganizationMemberJoinedEvent 발행
8. "가입 요청이 전송되었습니다. 승인을 기다려주세요." 메시지 반환

#### 3. 관리자가 멤버 승인

1. 관리자가 Discord Bot 명령어로 승인 요청
   ```
   /approve-member @username
   ```
2. Bot이 ApproveOrganizationMemberCommand 실행 (TBD - 현재 미구현)
3. 시스템이 PENDING 상태 확인
4. APPROVED로 상태 변경
5. OrganizationMemberApprovedEvent 발행
6. Discord 알림으로 승인 완료 메시지 전송

#### 4. 멤버가 제출 (조직 활성 멤버 검증 포함)

1. 멤버가 GitHub Issue에 댓글로 블로그 URL 게시
2. GitHub Webhook이 POST /webhook/github로 전송
3. RecordSubmissionCommand 실행
4. 시스템이 GitHub Issue URL로 Cycle 찾기
5. Cycle이 속한 Generation 찾기
6. Generation이 속한 Organization 찾기
7. GitHub Username으로 Member 찾기
8. **조직 활성 멤버 확인**: `isActiveMember(organizationId, memberId)`
9. 활성 멤버가 아니면 ForbiddenError 발생
10. 활성 멤버면 Submission 생성 및 저장
11. 조직별 Discord 웹훅 URL로 알림 전송

### 실패/예외 시나리오

#### 1. Slug 중복으로 조직 생성 실패

1. 운영자가 중복된 slug로 조직 생성 요청
2. CreateOrganizationCommand가 Slug 중복 검사
3. "Organization with slug 'dongueldonguel' already exists" 에러 반환
4. 운영자가 다른 slug로 재시도

#### 2. 활성 멤버가 아니어서 제출 실패

1. 멤버가 GitHub Issue에 댓글로 블로그 URL 게시
2. GitHub Webhook이 POST /webhook/github로 전송
3. RecordSubmissionCommand 실행
4. 조직 활성 멤버 확인 실패 (PENDING 또는 INACTIVE 상태)
5. "Member is not an active member of the organization" ForbiddenError 발생
6. GitHub Webhook이 403 응답 반환 (또는 200 with 에러 메시지)
7. 멤버가 Discord Bot으로 가입 승인 상태 확인

#### 3. 존재하지 않는 조직에 가입 시도

1. 멤버가 `/join-org nonexistent-org` 명령어 실행
2. JoinOrganizationCommand가 조직 조회 실패
3. "Organization not found" 에러 반환
4. 멤버가 올바른 조직 slug로 재시도

## 제약사항 및 고려사항 (Constraints)

### 보안

- **조직별 데이터 격리**: 조직 A의 데이터가 조직 B에 노출되지 않도록 쿼리 레벨에서 검증
- **역할 기반 접근 제어**: OWNER/ADMIN/MEMBER 역할에 따른 권한 검증 필요
- **Discord 웹훅 URL 보안**: DB에 암호화하여 저장 권장 (현재 평문 저장)
- **감사 로그**: 조직 생성/비활성화, 멤버 승인/거절 기록 필요 (TBD)

### 성능

- **인덱싱**:
  - `organizations_slug_idx` - Slug 기반 조회 최적화
  - `org_members_org_member_idx` - 조직-멤버 조합 조회 최적화
  - `org_members_status_idx` - 상태 기반 필터링 최적화
- **캐싱**:
  - 조직별 활성 멤버 목록을 Redis에 캐싱 권장 (TTL: 5분)
  - 조직별 Discord 웹훅 URL 캐싱 권장
- **Connection Pooling**:
  - 최소 연결: 10
  - 최대 연결: 100 (조직 수 × 10)

### 배포

- **Database Migration**: Drizzle ORM 마이그레이션으로 organizations, organization_members 테이블 생성
- **Seed Data**: 기존 단일 테넌트 데이터를 멀티 테넌트로 변환하는 스크립트 필요
- **Rolling Update**: 무중단 배포 가능 (Read Replica 사용 시)

### 롤백

- **Schema Rollback**: Drizzle 마이그레이션 롤백으로 organizations, organization_members 테이블 삭제
- **Data Recovery**: 백업에서 복구 (조직 생성/수정/삭제 이력 감사 로그 필요)
- **Feature Flag**: 멀티 테넌트 기능을 Feature Flag로 관리하여 긴급 시 비활성화 가능

### 호환성

- **Backward Compatibility**:
  - 기존 단일 테넌트 API를 계속 지원 (조직 slug를 'dongueldonguel'으로 하드코딩)
  - GitHub Webhook endpoint는 기존과 동일하게 동작 (조직 확인 로직만 추가)
- **Breaking Changes**:
  - GraphQL API에 organizationSlug 파라미터 추가 (기본값: 'dongueldonguel')

### 앱 간 통신

- 없음 (단일 앱 구조)

## 향후 확장 가능성 (Future Expansion)

### 1. 조직별 커스텀 도메인

- 현재: `dongueldonguel.api.example.com` (slug 기반 하위 도메인)
- 추후: `mywritinggroup.com` (사용자 정의 도메인)
- 구현: organizations 테이블에 custom_domain 컬럼 추가

### 2. 조직간 데이터 공유

- 현재: 조직별 데이터 완전 격리
- 추후: 특정 콘텐츠를 여러 조직에 공유 가능
- 구현: shared_posts 테이블 추가

### 3. 조직 간 이관 (Migration)

- 현재: 조직 간 이관 기능 없음
- 추후: Generation/Cycle/Submission을 다른 조직으로 이관
- 구현: MigrationCommand 추가

### 4. 조직 템플릿

- 현재: 조직 생성 시 매번 설정 입력
- 추후: 미리 정의된 템플릿으로 빠른 조직 생성
- 구현: organization_templates 테이블 추가

### 5. 조직별 통계 대시보드

- 현재: 기본 제출 현황만 제공
- 추후: 조직별 활동 메트릭, 참여도 추이, 멤버 성과 등 시각화
- 구현: AnalyticsQuery 및 GraphQL Query 추가

## 추가로 필요 정보 (Needed Data/Decisions)

### TBD: 인증/인가 구현

- **질문**: GraphQL API에 인증 미들웨어를 어떻게 구현할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Discord OAuth 2.0 (권장)
  2. JWT Token
  3. API Key (관리자 전용)

### TBD: Discord Bot 명령어 구현

- **질문**: Discord Bot에 어떤 조직 관리 명령어를 추가할 것인가?
- **오너**: Product Team
- **제안**:
  - `/join-org <slug>` - 조직 가입 요청
  - `/my-orgs` - 내가 속한 조직 목록
  - `/org-status <slug>` - 조직별 현재 사이클 조회
  - `/approve-member <username>` - 멤버 승인 (관리자 전용)

### TBD: 조직 생성 권한

- **질문**: 누가 조직을 생성할 수 있는가?
- **오너**: Product Team
- **옵션**:
  1. 전체 공개 (누구나 생성 가능)
  2. 관리자 승인 필요
  3. 유료 플랜 (수익화)

### TBD: 조직 삭제 정책

- **질문**: 조직 삭제 시 연관 데이터(Generation, Cycle, Submission)를 어떻게 처리할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Soft Delete (is_active = false)
  2. Hard Delete (모든 데이터 삭제)
  3. Archive (별도 테이블로 이관)

### TBD: Discord 웹훅 URL 암호화

- **질문**: Discord 웹훅 URL을 DB에 암호화하여 저장할 것인가?
- **오너**: Security Team
- **권장**: 예 (민감 정보이므로 암호화 권장)
