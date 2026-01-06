# 조직 관리 API (Organization Management API)

- **Status**: As-Is (현재 구현)
- **App Scope**: apps/server
- **Scope**: 조직 및 조직원 관리 기능
- **Based on**:
  - Facts:
    - [.claude/docs/apps/server/facts/domain/organization.md](../../facts/domain/organization.md)
    - [.claude/docs/apps/server/facts/domain/organization-member.md](../../facts/domain/organization-member.md)
    - [.claude/docs/apps/server/facts/application/commands.md](../../facts/application/commands.md)
    - [.claude/docs/apps/server/facts/application/queries.md](../../facts/application/queries.md)
  - Insights:
    - [.claude/docs/apps/server/insights/operations/organization-management.md](../../insights/operations/organization-management.md)
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## 개요 (Overview)

- **목적**: 조직(스터디 그룹) 생성, 멤버 초대, 승인, 관리 기능 제공
- **범위**:
  - **In-Scope**:
    - 조직 생성/조회/수정/비활성화
    - 멤버 초대/승인/거절/역할 변경
    - 조직별 멤버 목록 조회
    - 회원별 소속 조직 목록 조회
  - **Out-of-Scope**:
    - 조직 삭제 (Soft Delete만 지원)
    - 조직 간 멤버 이관
    - 대량 멤버 추가 (Batch)
- **비즈니스 가치**:
  - **운영 효율성**: GUI 없이도 GraphQL API로 조직 관리 가능
  - **확장성**: 단일 인스턴스로 무한한 조직 운영 가능
  - **프라이버시**: 조직별 멤버 관리로 데이터 격리 보장
  - **자동화**: n8n 워크플로우와 연동하여 멤버 승인 자동화 가능
- **관련 앱**: apps/server (백엔드 API 서버)

## 핵심 기능 (Core Features)

### 1. 조직 생성 (Create Organization)

- **설명**: 새로운 조직(스터디 그룹) 생성
- **주요 규칙**:
  - 조직 이름은 1-100자, 빈 문자열 불가
  - Slug는 자동 생성 가능 (한글 → 영문 하이픈 변환)
  - Slug는 전역적으로 고유 (중복 불가)
  - Discord 웹훅 URL은 선택적 (유효성 검증: `discord.com` 호스트네임)
  - 생성 시 자동으로 활성화 상태 (is_active = true)

### 2. 조직 조회 (Get Organization)

- **설명**: Slug 또는 ID로 조직 조회
- **주요 규칙**:
  - Slug로 조회 (주요 진입점)
  - ID로 조회 가능
  - 존재하지 않는 조직은 null 반환

### 3. 조직 목록 조회 (List Organizations)

- **설명**: 전체 또는 필터링된 조직 목록 조회
- **주요 규칙**:
  - 전체 조직 목록 조회
  - 활성화된 조직만 필터링 가능 (TBD)

### 4. 조직 수정 (Update Organization)

- **설명**: 조직 정보 수정 (이름, Discord 웹훅 URL)
- **주요 규칙**:
  - Discord 웹훅 URL만 수정 가능 (TBD - 현재 updateDiscordWebhookUrl 메서드만 존재)
  - 이름 수정은 미구현 (TBD)
  - Slug 수정 불가 (불변)

### 5. 조직 활성화/비활성화 (Activate/Deactivate Organization)

- **설명**: 조직 활성화 상태 변경
- **주요 규칙**:
  - activate(): 이미 활성화된 경우 무시 (idempotent)
  - deactivate(): 이미 비활성화된 경우 무시 (idempotent)
  - 비활성화된 조직의 멤버는 제출 불가

### 6. 조직 가입 요청 (Join Organization)

- **설명**: 멤버가 조직에 가입 요청 (PENDING 상태로 생성)
- **주요 규칙**:
  - 조직이 존재해야 함
  - 멤버가 존재해야 함 (Discord ID로)
  - 이미 속해 있는 멤버는 재가입 불가
  - PENDING 상태로 생성 (승인 필요)
  - isNew 플래그로 신규/기존 멤버 구분

### 7. 멤버 초대 (Add Member to Organization)

- **설명**: 관리자가 조직에 멤버 추가 (PENDING 상태로 생성)
- **주요 규칙**:
  - 조직이 존재해야 함
  - 멤버가 존재해야 함
  - 역할 지정 가능 (기본값: MEMBER)
  - PENDING 상태로 생성 (승인 필요)

### 8. 멤버 승인 (Approve Organization Member)

- **설명**: PENDING 상태 멤버를 APPROVED로 변경
- **주요 규칙**:
  - PENDING 상태만 승인 가능
  - APPROVED로 상태 변경
  - 상태 변경 일시(updated_at) 업데이트

### 9. 멤버 거절 (Reject Organization Member)

- **설명**: PENDING 상태 멤버를 REJECTED로 변경
- **주요 규칙**:
  - PENDING 상태만 거절 가능
  - REJECTED로 상태 변경
  - 상태 변경 일시(updated_at) 업데이트

### 10. 멤버 비활성화 (Deactivate Organization Member)

- **설명**: APPROVED 상태 멤버를 INACTIVE로 변경
- **주요 규칙**:
  - APPROVED 상태만 비활성화 가능
  - INACTIVE로 상태 변경
  - 비활성화된 멤버는 제출 불가

### 11. 멤버 역할 변경 (Change Member Role)

- **설명**: 조직원 역할 변경 (OWNER/ADMIN/MEMBER)
- **주요 규칙**:
  - OWNER/ADMIN만 역할 변경 가능 (TBD - 권한 검증 미구현)
  - OWNER 역할은 최소 1명 유지 권장 (비즈니스 규칙, 미구현)

### 12. 조직별 멤버 목록 조회 (Get Organization Members)

- **설명**: 특정 조직의 멤버 목록 조회
- **주요 규칙**:
  - 활성 멤버(APPROVED)만 조회 가능
  - 역할, 상태 포함

### 13. 회원별 소속 조직 목록 조회 (Get Member Organizations)

- **설명**: 특정 회원이 속한 조직 목록 조회
- **주요 규칙**:
  - 회원 ID 또는 Discord ID로 조회
  - 활성 멤버(APPROVED)인 조직만 포함

## 기술 사양 (Technical Specifications)

### 아키텍처 개요

**CQRS Pattern**:
- **Commands**: CreateOrganizationCommand, JoinOrganizationCommand, AddMemberToOrganizationCommand
- **Queries**: GetOrganizationQuery, GetOrganizationMembersQuery, GetMemberOrganizationsQuery

**Service Layer**:
- OrganizationService (TBD - 현재 없음)
- OrganizationMemberService (TBD - 현재 없음)

### 의존성

**Apps**:
- 없음 (단일 앱 구조)

**Packages**:
- 없음

**Libraries**:
- `drizzle-orm` - ORM
- `postgres` - Database client
- `pylon` - GraphQL framework

**Env Vars**:
- `DATABASE_URL` - PostgreSQL connection string

### 구현 접근

**Command Handlers**:
```
CreateOrganizationCommand
  - Slug 중복 검사
  - Organization 엔티티 생성
  - OrganizationRepository.save()

JoinOrganizationCommand
  - 조직 존재 확인
  - 멤버 존재 확인
  - OrganizationMember 엔티티 생성 (PENDING)
  - OrganizationMemberRepository.save()

AddMemberToOrganizationCommand
  - 조직 존재 확인
  - 멤버 존재 확인
  - OrganizationMember 엔티티 생성 (PENDING)
  - OrganizationMemberRepository.save()
```

**Query Handlers**:
```
GetOrganizationQuery
  - OrganizationRepository.findBySlug(slug)

GetOrganizationMembersQuery
  - OrganizationMemberRepository.findActiveByOrganization(organizationId)

GetMemberOrganizationsQuery
  - OrganizationMemberRepository.findByMember(memberId)
```

### 관측/운영

- **Logging**: TBD (현재 구현되지 않음)
- **Metrics**: TBD (Prometheus/Grafana integration 필요)
- **Audit Log**: TBD (조직 생성/수정, 멤버 승인/거절 기록 필요)

### 실패 모드/대응

- **Slug 중복**: CreateOrganizationCommand에서 에러 반환 ("Organization with slug already exists")
- **조직 미존재**: 404 에러 반환 ("Organization not found")
- **멤버 미존재**: 404 에러 반환 ("Member not found")
- **이미 가입된 멤버**: 409 에러 반환 ("Already a member")
- **잘못된 상태 전이**: Domain 엔티티 레벨에서 에러 발생

## 데이터 구조 (Data Structure)

### 모델/스키마

**organizations 테이블**: [멀티 테넌트 아키텍처 명세서 참조](./multi-tenant-architecture.md#데이터-구조-data-structure)

**organization_members 테이블**: [멀티 테넌트 아키텍처 명세서 참조](./multi-tenant-architecture.md#데이터-구조-data-structure)

### 데이터 흐름

**조직 생성 흐름**:
```
Client (GraphQL Mutation)
  ↓
CreateOrganizationCommand.execute()
  ↓
OrganizationRepository.findBySlug() - 중복 검사
  ↓
Organization.create() - 도메인 엔티티 생성
  ↓
OrganizationRepository.save() - DB 저장
  ↓
Domain Event 발행 (OrganizationCreatedEvent)
  ↓
Response: CreateOrganizationResult
```

**조직 가입 흐름**:
```
Client (Discord Bot / GraphQL)
  ↓
JoinOrganizationCommand.execute()
  ↓
OrganizationRepository.findBySlug() - 조직 존재 확인
  ↓
MemberRepository.findByDiscordId() - 멤버 존재 확인
  ↓
OrganizationMemberRepository.findByOrganizationAndMember() - 이미 속해 있는지 확인
  ↓
OrganizationMember.create(PENDING) - 연결 엔티티 생성
  ↓
OrganizationMemberRepository.save() - DB 저장
  ↓
Domain Event 발행 (OrganizationMemberJoinedEvent)
  ↓
Response: JoinOrganizationResult (isNew 플래그 포함)
```

**멤버 승인 흐름**:
```
Client (Discord Bot / GraphQL)
  ↓
ApproveOrganizationMemberCommand.execute() (TBD - 현재 미구현)
  ↓
OrganizationMemberRepository.findById() - PENDING 상태 확인
  ↓
OrganizationMember.approve() - 상태 변경 (PENDING → APPROVED)
  ↓
OrganizationMemberRepository.save() - DB 업데이트
  ↓
Domain Event 발행 (OrganizationMemberApprovedEvent)
  ↓
Discord 알림 발송 (승인 완료 메시지)
  ↓
Response: ApproveOrganizationMemberResult
```

### 검증/제약

**Value Object Validation**:
- `OrganizationName`: 1-100자, 빈 문자열 불가
- `OrganizationSlug`: 2-50자, 소문자/알파벳/숫자/하이픈만 허용
- `DiscordWebhookUrl`: `discord.com` 호스트네임, `/api/webhooks/` 경로

**Business Rules**:
- Slug 중복 불가
- PENDING 상태만 승인/거절 가능
- APPROVED 상태만 비활성화 가능
- OWNER/ADMIN만 멤버 관리 권한 (TBD - 미구현)

## API 명세 (API Specifications)

### GraphQL Mutations

#### createOrganization

- **Purpose**: 조직 생성
- **Location**: `apps/server/src/application/commands/create-organization.command.ts` (L30-L59)
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
    name: string;          // 1-100자, 필수
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
- **Evidence**: [create-organization.command.ts](../../facts/application/commands.md#createorganizationcommand)

#### joinOrganization

- **Purpose**: 조직 가입 요청 (PENDING 상태로 생성)
- **Location**: `apps/server/src/application/commands/join-organization.command.ts` (L42-L106)
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
- **Evidence**: [join-organization.command.ts](../../facts/application/commands.md#joinorganizationcommand)

#### addMemberToOrganization

- **Purpose**: 관리자가 조직에 멤버 추가 (PENDING 상태)
- **Location**: `apps/server/src/application/commands/add-member-to-organization.command.ts` (L42-L101)
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
        discordId
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
      discordId: string;
    };
  }
  ```
- **Errors**:
  - `403`: Forbidden (OWNER/ADMIN 역할 필요)
  - `404`: Organization not found
  - `404`: Member not found
  - `409`: Already a member
- **Evidence**: [add-member-to-organization.command.ts](../../facts/application/commands.md#addmembertoorganizationcommand)

### GraphQL Queries

#### organization (or getOrganization)

- **Purpose**: Slug으로 조직 조회
- **Location**: `apps/server/src/application/queries/get-organization.query.ts` (L26-L39)
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
- **Evidence**: [get-organization.query.ts](../../facts/application/queries.md#getorganizationquery)

#### organizationMembers (or getOrganizationMembers)

- **Purpose**: 조직의 멤버 목록 조회
- **Location**: `apps/server/src/application/queries/get-organization-members.query.ts`
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  query GetOrganizationMembers($organizationSlug: String!) {
    organizationMembers(organizationSlug: $organizationSlug) {
      id
      organizationId
      memberId
      member {
        id
        name
        github
        discordId
      }
      role
      status
      joinedAt
      updatedAt
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetOrganizationMembersResponse {
    organizationMembers: Array<{
      id: number;
      organizationId: number;
      memberId: number;
      member: {
        id: number;
        name: string;
        github: string | null;
        discordId: string;
      };
      role: 'OWNER' | 'ADMIN' | 'MEMBER';
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
      joinedAt: Date;
      updatedAt: Date;
    }>;
  }
  ```
- **Errors**:
  - `404`: Organization not found
- **Evidence**: [get-organization-members.query.ts](../../facts/application/queries.md#getorganizationmembersquery)

#### memberOrganizations (or getMemberOrganizations)

- **Purpose**: 회원이 속한 조직 목록 조회
- **Location**: `apps/server/src/application/queries/get-member-organizations.query.ts`
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  query GetMemberOrganizations($memberId: Int!) {
    memberOrganizations(memberId: $memberId) {
      id
      name
      slug
      isActive
      member {
        id
        role
        status
        joinedAt
      }
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetMemberOrganizationsResponse {
    memberOrganizations: Array<{
      id: number;
      name: string;
      slug: string;
      isActive: boolean;
      member: {
        id: number;
        role: 'OWNER' | 'ADMIN' | 'MEMBER';
        status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
        joinedAt: Date;
      };
    }>;
  }
  ```
- **Errors**:
  - `404`: Member not found
- **Evidence**: [get-member-organizations.query.ts](../../facts/application/queries.md#getmemberorganizationsquery)

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오

#### 1. 운영자가 새로운 조직 생성

1. 운영자가 GraphQL Playground 또는 Discord Bot으로 조직 생성 요청
   ```graphql
   mutation {
     createOrganization(input: {
       name: "글쓰기 모임 A"
       slug: "writing-group-a"
       discordWebhookUrl: "https://discord.com/api/webhooks/..."
     }) {
       organization { id name slug }
     }
   }
   ```
2. CreateOrganizationCommand가 Slug 중복 검사 (DB 조회)
3. 조직 엔티티 생성 및 DB 저장
4. OrganizationCreatedEvent 발행
5. Discord 알림: "새로운 조직 '글쓰기 모임 A'가 생성되었습니다." (TBD)
6. 생성된 조직 정보 반환

#### 2. 멤버가 조직에 가입 요청

1. 멤버가 Discord Bot 명령어로 가입 요청
   ```
   /join-org writing-group-a
   ```
2. Bot이 JoinOrganizationCommand 실행
3. 시스템이 조직 존재 확인 (slug: "writing-group-a")
4. 시스템이 멤버 존재 확인 (Discord ID로)
5. 이미 속해 있는지 확인 (organization_members 테이블 조회)
6. PENDING 상태로 조직원 생성
7. OrganizationMemberJoinedEvent 발행
8. Discord 알림:
   - 멤버에게: "가입 요청이 전송되었습니다. 승인을 기다려주세요."
   - 관리자에게: "@멤버님이 '글쓰기 모임 A'에 가입 요청했습니다." (TBD)
9. 응답 반환 (isNew: true)

#### 3. 관리자가 멤버 승인

1. 관리자가 Discord Bot 명령어로 승인 요청
   ```
   /approve-member @username
   ```
2. Bot이 ApproveOrganizationMemberCommand 실행 (TBD - 현재 미구현)
3. 시스템이 PENDING 상태 확인
4. APPROVED로 상태 변경
5. OrganizationMemberApprovedEvent 발행
6. Discord 알림:
   - 멤버에게: "🎉 '글쓰기 모임 A'에 가입이 승인되었습니다!"
   - 관리자에게: "@멤버님의 가입이 승인되었습니다." (TBD)
7. 응답 반환

#### 4. 관리자가 조직에 멤버 추가

1. 관리자가 Discord Bot 명령어로 멤버 추가
   ```
   /add-member @githubusername
   ```
2. Bot이 AddMemberToOrganizationCommand 실행
3. 시스템이 조직 존재 확인 (현재 채널의 조직 추론)
4. 시스템이 멤버 존재 확인 (GitHub username으로)
5. 이미 속해 있는지 확인
6. PENDING 상태로 조직원 생성 (역할: MEMBER)
7. Discord 알림:
   - 멤버에게: "관리자가 '글쓰기 모임 A'에 초대했습니다. 가입을 승인해주세요." (TBD)
8. 응답 반환

#### 5. 멤버가 자신의 소속 조직 목록 조회

1. 멤버가 Discord Bot 명령어로 조회
   ```
   /my-orgs
   ```
2. Bot이 GetMemberOrganizationsQuery 실행
3. 시스템이 멤버의 Discord ID로 회원 조회
4. organization_members 테이블에서 조직 목록 조회
5. Discord 임베드로 조직 목록 표시
   ```
   📋 내가 속한 조직 (2개)

   1. 글쓰기 모임 A (writing-group-a) - 역할: MEMBER
   2. 똥글똥글 (dongueldonguel) - 역할: ADMIN
   ```
6. 응답 반환

### 실패/예외 시나리오

#### 1. Slug 중복으로 조직 생성 실패

1. 운영자가 중복된 slug로 조직 생성 요청
   ```graphql
   mutation {
     createOrganization(input: { name: "똥글똥글", slug: "dongueldonguel" })
   }
   ```
2. CreateOrganizationCommand가 Slug 중복 검사 (DB 조회)
3. "Organization with slug 'dongueldonguel' already exists" 에러 반환
4. 운영자가 다른 slug로 재시도

#### 2. 존재하지 않는 조직에 가입 시도

1. 멤버가 `/join-org nonexistent-org` 명령어 실행
2. JoinOrganizationCommand가 조직 조회 실패
3. "Organization not found" 에러 반환 (404)
4. 멤버가 올바른 조직 slug로 재시도

#### 3. 이미 가입된 조직에 재가입 시도

1. 멤버가 이미 속한 조직에 `/join-org writing-group-a` 실행
2. JoinOrganizationCommand가 이미 속해 있는지 확인
3. "Already a member" 에러 반환 (409)
4. 멤버가 상태 확인 (APPROVED/INACTIVE/REJECTED)

#### 4. 존재하지 않는 멤버를 조직에 추가 시도

1. 관리자가 `/add-member @nonexistent` 실행
2. AddMemberToOrganizationCommand가 멤버 조회 실패
3. "Member not found" 에러 반환 (404)
4. 관리자가 먼저 멤버 생성 요청

#### 5. PENDING 아닌 멤버 승인 시도

1. 관리자가 이미 APPROVED된 멤버를 승인 시도
2. ApproveOrganizationMemberCommand가 상태 확인
3. "Only pending members can be approved" 에러 반환
4. 관리자가 상태 확인

## 제약사항 및 고려사항 (Constraints)

### 보안

- **역할 기반 접근 제어 (RBAC)**:
  - OWNER: 조직 전체 관리
  - ADMIN: 멤버 관리
  - MEMBER: 제출 및 조회
- **승인 프로세스**: PENDING → APPROVED 상태 전이로 무단 가입 방지
- **감사 로그**: 조직 생성/수정, 멤버 승인/거절 기록 필요 (TBD)
- **Discord 웹훅 URL 보안**: DB에 암호화하여 저장 권장

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
- **Feature Flag**: 조직 관리 기능을 Feature Flag로 관리하여 긴급 시 비활성화 가능

### 롤백

- **Schema Rollback**: Drizzle 마이그레이션 롤백으로 organizations, organization_members 테이블 삭제
- **Data Recovery**: 백업에서 복원 (조직 생성/수정 이력 감사 로그 필요)
- **Soft Delete**: 조직 비활성화(is_active = false)로 데이터 보존

### 호환성

- **Backward Compatibility**:
  - 기존 단일 테넌트 API를 계속 지원 (조직 slug를 'dongueldonguel'으로 하드코딩)
  - GitHub Webhook endpoint는 기존과 동일하게 동작 (조직 확인 로직만 추가)
- **Breaking Changes**:
  - GraphQL API에 organizationSlug 파라미터 추가 (기본값: 'dongueldonguel')

### 앱 간 통신

- 없음 (단일 앱 구조)

## 향후 확장 가능성 (Future Expansion)

### 1. 조직 삭제 (Hard Delete)

- **현재**: Soft Delete만 지원 (is_active = false)
- **추후**: Hard Delete로 모든 데이터 영구 삭제
- **구현**: DeleteOrganizationCommand 추가 (관련 데이터 모두 삭제)

### 2. 조직 간 멤버 이관

- **현재**: 조직 간 이관 기능 없음
- **추후**: Generation/Cycle/Submission을 다른 조직으로 이관
- **구현**: MigrateMemberCommand 추가

### 3. 대량 멤버 추가 (Batch)

- **현재**: 한 번에 한 멤버만 추가
- **추후**: CSV 파일로 대량 멤버 추가
- **구현**: BatchAddMembersCommand 추가

### 4. 조직 템플릿

- **현재**: 조직 생성 시 매번 설정 입력
- **추후**: 미리 정의된 템플릿으로 빠른 조직 생성
- **구현**: organization_templates 테이블 추가

### 5. 조직별 권한 세분화

- **현재**: OWNER/ADMIN/MEMBER 3단계
- **추후**: 더 세분화된 권한 (예: MODERATOR, GUEST)
- **구현**: OrganizationRole enum에 추가

### 6. 조직별 설정

- **현재**: Discord 웹훅 URL만 설정 가능
- **추후**: 조직별 다양한 설정 (예: 제출 마감 요일, 알림 시간 등)
- **구현**: organization_settings 테이블 추가

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
  - `/add-member <github>` - 멤버 추가 (관리자 전용)
  - `/approve-member <username>` - 멤버 승인 (관리자 전용)
  - `/reject-member <username>` - 멤버 거절 (관리자 전용)
  - `/org-members` - 조직 멤버 목록 (관리자 전용)

### TBD: 조직 생성 권한

- **질문**: 누가 조직을 생성할 수 있는가?
- **오너**: Product Team
- **옵션**:
  1. 전체 공개 (누구나 생성 가능)
  2. 관리자 승인 필요
  3. 유료 플랜 (수익화)

### TBD: 자동 승인 옵션

- **질문**: 공개 조직은 자동으로 승인할 것인가?
- **오너**: Product Team
- **제안**: 조직 설정에 `isPublic` 플래그 추가하여 공개 조직은 자동 승인

### TBD: 멤버 승인 알림

- **질문**: PENDING 멤버 승인 알림을 어떻게 발송할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Discord Webhook (관리자 전용 채널)
  2. Discord DM (개별 관리자에게)
  3. Email (백업)

### TBD: 감사 로그 구현

- **질문**: 조직 관리 이력을 어떻게 기록할 것인가?
- **오너**: Backend Team
- **제안**:
  - audit_logs 테이블 추가 (organization_id, action, actor_id, timestamp, details)
  - 기록할 액션: 조직 생성/수정/비활성화, 멤버 승인/거절/역할 변경
