---
metadata:
  version: "2.0.0"
  created_at: "2026-01-05T10:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "ac29965"
  based_on_facts: "../facts/index.md"
  based_on_insights: "../insights/index.md"
---

# 똥글똥글 기능 명세서 (Feature Specifications)

- **Scope**: 전체 시스템 기능 명세
- **Based on Facts**: [../facts/index.md](../facts/index.md)
- **Based on Insights**: [../insights/index.md](../insights/index.md)
- **Last Verified**: 2026-01-05
- **Git Commit**: ac29965

## 개요

이 섹션은 똥글똥글 시스템의 각 기능에 대한 종합적인 명세서를 포함합니다. 각 명세서는 기술적 구현 사실(facts)과 비즈니스 분석(insights)을 결합하여, 기술 팀과 비기술 이해관계자 모두가 이해할 수 있도록 작성되었습니다.

## v3.0.0 주요 변경사항 (멀티 테넌트 지원)

### 멀티 테넌트 아키텍처 도입

**새로운 명세서**:
- **[멀티 테넌트 아키텍처](./multi-tenant-architecture.md)** - 조직(Organization) 엔티티, RBAC, 데이터 격리 (NEW)
- **[조직 관리 API](./organization-management.md)** - 조직 생성, 멤버 초대/승인/관리 (NEW)
- **[Discord Bot 통합](./discord-bot-integration.md)** - Slash Commands, 조직별 알림 분리 (NEW)
- **[GraphQL API](./graphql-api.md)** - Pylon Framework 기반 GraphQL 스키마 및 리졸버 (NEW)

**데이터베이스 변경사항**:
- `organizations` 테이블 추가 - 조직(스터디 그룹) 테이블
- `organization_members` 테이블 추가 - 조직-회원 조인 테이블 (역할, 상태)
- `members` 테이블 변경 - `github` UNIQUE 제약조건 제거
- `generations` 테이블 변경 - `organization_id` FK 추가

**비즈니스 가치**:
- 인프라 비용 절감: 단일 인스턴스로 N개 조직 운영 (10개 조직 기준 월 $180 절감)
- 확장성: 수평적 확장(Scale Out) 가능, 이론적으로 무제한 조직 운영
- 프라이버시: 조직별 데이터 격리로 보안 강화 및 GDPR/CCPA 준수 용이
- 수익화 잠재력: 각 조직을 독립적인 SaaS 서비스로 제공 가능

### v2.0.0 주요 변경사항 (DDD 아키텍처)

### DDD 4계층 구조 도입

**기존 명세서 DDD 컨텍스트 업데이트**:
- **[DDD 아키텍처](./ddd-architecture.md)** - DDD 4계층 구조, CQRS 패턴, 도메인 이벤트 기반 아키텍처
- **[도메인 서비스](./domain-services.md)** - 회원, 기수, 사이클, 제출 도메인의 비즈니스 로직
- **[GitHub Webhook Handler](./github-webhook.md)** - Command, Event Handler, 도메인 이벤트 사용
- **[Reminder System](./reminder-system.md)** - CQRS 패턴, Query 사용
- **[Status Tracking](./status-tracking.md)** - CQRS 패턴, Query 사용
- **[Discord Notifications](./discord-notifications.md)** - 이벤트 기반 아키텍처, Event Handler 사용

## 명세서 목록

### 아키텍처 (Architecture)

- **[멀티 테넌트 아키텍처](./multi-tenant-architecture.md)** ⭐ NEW (v3.0.0)
  - 조직(Organization) 엔티티 및 리포지토리
  - 조직원(OrganizationMember) 연결 엔티티 및 RBAC
  - 데이터베이스 스키마 (organizations, organization_members 테이블)
  - 조직별 Discord 알림 격리
  - GitHub Username 중복 허용
  - 비즈니스 가치: 인프라 비용 절감 $180/월, 확장성, 프라이버시 강화

- **[DDD 아키텍처](./ddd-architecture.md)**
  - 4계층 DDD 구조 (Domain, Application, Infrastructure, Presentation)
  - CQRS 패턴 (Command/Query 분리)
  - 도메인 이벤트 기반 알림 시스템
  - 값 객체 (Value Objects)로 데이터 무결성 보장
  - 비즈니스 가치: 유지보수성 40-60% 개선, 개발 속도 30-50% 향상

- **[도메인 서비스](./domain-services.md)**
  - MemberService: 회원 조회 및 검증
  - GenerationService: 기수 활성화 관리
  - CycleService: 날짜 기반 사이클 조회
  - SubmissionService: 제출 가능 여부 검증

### 조직 관리 (Organization Management)

- **[조직 관리 API](./organization-management.md)** ⭐ NEW (v3.0.0)
  - 조직 생성/조회/수정/비활성화
  - 멤버 초대/승인/거절/역할 변경
  - 조직별 멤버 목록 조회
  - 회원별 소속 조직 목록 조회
  - 비즈니스 가치: 운영 효율성, 확장성, 프라이버시, 자동화

### 핵심 기능 (Core Features)

- **[GitHub Webhook Handler](./github-webhook.md)** - GitHub 이벤트 기반 자동화
  - Issue 생성으로 자동 회차 생성
  - Issue 댓글로 제출 처리
  - Week 패턴 파싱 및 마감일 추출
  - **DDD 컨텍스트**: RecordSubmissionCommand, CreateCycleCommand, SubmissionRecordedEvent

- **[Reminder System](./reminder-system.md)** - 마감 리마인더 자동화
  - 마감 임박 회차 조회
  - 미제출자 목록 조회
  - Discord 리마인더 발송
  - **CQRS 컨텍스트**: GetReminderTargetsQuery

- **[Status Tracking](./status-tracking.md)** - 제출 현황 조회
  - 현재 진행중인 회차 자동 조회
  - 회차별 제출 현황 JSON 조회
  - Discord webhook 포맷 변환
  - 실시간 통계 계산
  - 남은 시간 표시 (daysLeft, hoursLeft)
  - **CQRS 컨텍스트**: GetCycleStatusQuery

- **[Discord Notifications](./discord-notifications.md)** - Discord 알림 시스템
  - 제출 알림 메시지 생성
  - 마감 리마인더 메시지 생성
  - 제출 현황 리포트 메시지 생성
  - **이벤트 기반 컨텍스트**: SubmissionEventHandler, 도메인 이벤트 구독

### Discord Bot & API (Discord Bot & API)

- **[Discord Bot 통합](./discord-bot-integration.md)** ⭐ NEW (v3.0.0)
  - /current-cycle Command (현재 사이클 조회)
  - /check-submission Command (제출 현황 조회)
  - 조직별 Discord 알림 분리
  - Discord 임베드 메시지 형식
  - 비즈니스 가치: 사용자 경험 개선, 조직별 프라이버시, 실시간 피드백

- **[GraphQL API](./graphql-api.md)** ⭐ NEW (v3.0.0)
  - 8개 Queries (members, member, generations, generation, activeGeneration, cycles, cycle, activeCycle, cycleStatus)
  - 4개 Mutations (addMember, addGeneration, addCycle, addSubmission)
  - Pylon Framework 기반 Code-First 접근
  - TypeScript 타입 안전성 보장
  - 비즈니스 가치: 타입 안전성, 유연성, 개발 생산성, 확장성

## 데이터 모델 관계도

```
organizations (조직) ⭐ NEW (v3.0.0)
    ↓ 1:N
generations (기수)
    ↓ 1:N
cycles (회차/주차)
    ↓ 1:N
submissions (제출 기록)
    ↓ N:1
members (멤버)

organization_members (조직-회원 조인 테이블) ⭐ NEW (v3.0.0)
    ↓ N:1 (organizations)
    ↓ N:1 (members)

generation_members (기수-멤버 조인 테이블) [DEPRECATED]
    ↓ N:1 (generations)
    ↓ N:1 (members)
```

## 시스템 아키텍처 개요

**DDD 4계층 구조 (v2.0.0+)**:
```
Presentation Layer
    ├── HTTP Routes (GitHub Webhook, Reminder, Status)
    ├── Discord Bot (Slash Commands)
    └── GraphQL API ⭐ NEW (v3.0.0)
    ↓
Application Layer
    ├── Commands (RecordSubmission, CreateMember, CreateCycle, CreateGeneration, CreateOrganization, JoinOrganization) ⭐ UPDATED (v3.0.0)
    ├── Queries (GetCycleStatus, GetReminderTargets, GetAllMembers, GetOrganization, GetOrganizationMembers) ⭐ UPDATED (v3.0.0)
    └── Event Handlers (SubmissionEvent, MemberEvent, CycleEvent, OrganizationEvent) ⭐ UPDATED (v3.0.0)
    ↓
Domain Layer
    ├── Entities (Member, Generation, Cycle, Submission, Organization, OrganizationMember) ⭐ UPDATED (v3.0.0)
    ├── Value Objects (GithubUsername, BlogUrl, Week, OrganizationSlug, OrganizationName, ...) ⭐ UPDATED (v3.0.0)
    ├── Domain Services (MemberService, GenerationService, CycleService, SubmissionService)
    └── Domain Events (SubmissionRecorded, MemberRegistered, OrganizationCreated, ...) ⭐ UPDATED (v3.0.0)
    ↓
Infrastructure Layer
    ├── Persistence (PostgreSQL + Drizzle ORM)
    └── External (Discord Webhook, GitHub Webhook)
```

**외부 연동**:
```
GitHub Repository
    ↓ (Webhook Events)
Presentation Layer (HTTP Routes)

Discord Bot
    ↓ (Slash Commands)
Presentation Layer (Discord Bot)

n8n Workflows
    ↓ (Scheduled Polling)
Presentation Layer (HTTP Routes - Reminder/Status APIs)

Discord Webhook
    ← (Application Layer - Event Handlers)
Infrastructure Layer (Discord Service)
```

## 기능 상태 (Feature Status)

| 기능 | 상태 | 우선순위 | 비고 |
|------|------|----------|------|
| **멀티 테넌트 아키텍처** | As-Is | P0 | v3.0.0 완료 (commit 82509c3) |
| **조직(Organization) 엔티티** | As-Is | P0 | organizations 테이블 추가 |
| **조직원(OrganizationMember) 엔티티** | As-Is | P0 | organization_members 테이블 추가 |
| **RBAC (역할 기반 접근 제어)** | As-Is | P1 | OWNER/ADMIN/MEMBER 역할 |
| **조직별 Discord 알림 분리** | As-Is | P0 | discord_webhook_url 컬럼 추가 |
| **GitHub Username 중복 허용** | As-Is | P0 | github UNIQUE 제약조건 제거 |
| **GraphQL API** | As-Is | P1 | Pylon Framework 기반 |
| **Discord Bot Slash Commands** | As-Is | P1 | /current-cycle, /check-submission |
| **DDD 아키텍처** | As-Is | P0 | v2.0.0 완료 (commit ac29965) |
| **CQRS 패턴** | As-Is | P0 | Command 7개, Query 11개 ⭐ UPDATED (v3.0.0) |
| **도메인 이벤트** | As-Is | P0 | 11개 이벤트 ⭐ UPDATED (v3.0.0) |
| **값 객체** | As-Is | P0 | 20+개 값 객체 ⭐ UPDATED (v3.0.0) |
| GitHub Webhook - Issue Comment | As-Is | P0 | 운영 중 (RecordSubmissionCommand) |
| GitHub Webhook - Issues (Auto Cycle Creation) | As-Is | P0 | 운영 중 (CreateCycleCommand) |
| Reminder - Query Cycles | As-Is | P0 | 운영 중 (GetReminderTargetsQuery) |
| Reminder - Not Submitted Members | As-Is | P1 | 운영 중 (TODO: generation_members 활용) |
| Status - Current Cycle Query | As-Is | P0 | 운영 중 (GetCycleStatusQuery) |
| Discord Notifications - Submission | As-Is | P0 | 운영 중 (SubmissionRecordedEvent) |

## 주요 TODO 항목

### v3.0.0 멀티 테넌트 아키텍처 완료 (82509c3)

**새로운 아키텍처**:
- 조직(Organization) 엔티티 및 리포지토리 추가
- 조직원(OrganizationMember) 연결 엔티티 추가
- RBAC (역할 기반 접근 제어) 도입
- 조직별 Discord 알림 분리
- GitHub Username 중복 허용

**비즈니스 가치**:
- 인프라 비용 절감: 단일 인스턴스로 N개 조직 운영 (10개 조직 기준 월 $180 절감)
- 확장성: 수평적 확장(Scale Out) 가능
- 프라이버시: 조직별 데이터 격리로 보안 강화
  - 마감 임박 회차 조회
  - 미제출자 목록 조회
  - Discord 리마인더 발송
  - **CQRS 컨텍스트**: GetReminderTargetsQuery

- **[Status Tracking](./status-tracking.md)** - 제출 현황 조회
  - 현재 진행중인 회차 자동 조회
  - 회차별 제출 현황 JSON 조회
  - Discord webhook 포맷 변환
  - 실시간 통계 계산
  - 남은 시간 표시 (daysLeft, hoursLeft)
  - **CQRS 컨텍스트**: GetCycleStatusQuery

- **[Discord Notifications](./discord-notifications.md)** - Discord 알림 시스템
  - 제출 알림 메시지 생성
  - 마감 리마인더 메시지 생성
  - 제출 현황 리포트 메시지 생성
  - **이벤트 기반 컨텍스트**: SubmissionEventHandler, 도메인 이벤트 구독

## 데이터 모델 관계도

```
generations (기수)
    ↓ 1:N
cycles (회차/주차)
    ↓ 1:N
submissions (제출 기록)
    ↓ N:1
members (멤버)

generation_members (기수-멤버 조인 테이블)
    ↓ N:1 (generations)
    ↓ N:1 (members)
```

## 시스템 아키텍처 개요

**DDD 4계층 구조**:
```
Presentation Layer
    ├── HTTP Routes (GitHub Webhook, Reminder, Status)
    ├── Discord Bot (Slash Commands)
    └── GraphQL API
    ↓
Application Layer
    ├── Commands (RecordSubmission, CreateMember, CreateCycle, CreateGeneration)
    ├── Queries (GetCycleStatus, GetReminderTargets, GetAllMembers, ...)
    └── Event Handlers (SubmissionEvent, MemberEvent, CycleEvent)
    ↓
Domain Layer
    ├── Entities (Member, Generation, Cycle, Submission)
    ├── Value Objects (GithubUsername, BlogUrl, Week, ...)
    ├── Domain Services (MemberService, GenerationService, CycleService, SubmissionService)
    └── Domain Events (SubmissionRecorded, MemberRegistered, ...)
    ↓
Infrastructure Layer
    ├── Persistence (PostgreSQL + Drizzle ORM)
    └── External (Discord Webhook, GitHub Webhook)
```

**외부 연동**:
```
GitHub Repository
    ↓ (Webhook Events)
Presentation Layer (HTTP Routes)

Discord Bot
    ↓ (Slash Commands)
Presentation Layer (Discord Bot)

n8n Workflows
    ↓ (Scheduled Polling)
Presentation Layer (HTTP Routes - Reminder/Status APIs)

Discord Webhook
    ← (Application Layer - Event Handlers)
Infrastructure Layer (Discord Service)
```

## 기능 상태 (Feature Status)

| 기능 | 상태 | 우선순위 | 비고 |
|------|------|----------|------|
| **DDD 아키텍처** | As-Is | P0 | v2.0.0 완료 (commit ac29965) |
| **CQRS 패턴** | As-Is | P0 | Command 4개, Query 8개 |
| **도메인 이벤트** | As-Is | P0 | 5개 이벤트 정의 |
| **값 객체** | As-Is | P0 | 15+개 값 객체 |
| GitHub Webhook - Issue Comment | As-Is | P0 | 운영 중 (RecordSubmissionCommand) |
| GitHub Webhook - Issues (Auto Cycle Creation) | As-Is | P0 | 운영 중 (CreateCycleCommand) |
| Discord Bot - /check-submission | As-Is | P0 | 운영 중 |
| Discord Bot - Guild ID Support | As-Is | P1 | 개발 속도 개선 |
| Reminder - Query Cycles | As-Is | P0 | 운영 중 (GetReminderTargetsQuery) |
| Reminder - Not Submitted Members | As-Is | P1 | 운영 중 (TODO: generation_members 활용) |
| Reminder - Send Reminders | As-Is | P0 | 운영 중 |
| Status - Current Cycle Query | As-Is | P0 | 운영 중 (GetCycleStatusQuery) |
| Status - JSON Format | As-Is | P0 | 운영 중 (TODO: generation_members 활용) |
| Status - Discord Format | As-Is | P0 | 운영 중 |
| Health Check - Database Connection | As-Is | P0 | 운영 중 (Docker 지원) |
| Discord Notifications - Submission | As-Is | P0 | 운영 중 (SubmissionRecordedEvent) |
| Discord Notifications - Reminder | As-Is | P0 | 운영 중 |
| Discord Notifications - Status | As-Is | P0 | 운영 중 |
| GraphQL API | As-Is | P1 | 운영 중 |

## 주요 TODO 항목

### v2.0.0 DDD 아키텍처 완료 (ac29965)

**새로운 아키텍처**:
- 4계층 DDD 구조 도입 (Domain, Application, Infrastructure, Presentation)
- CQRS 패턴 적용 (Command 4개, Query 8개)
- 도메인 이벤트 기반 알림 시스템 (5개 이벤트)
- 값 객체로 데이터 무결성 보장 (15+개 값 객체)

**비즈니스 가치**:
- 코드 유지보수성 40-60% 개선 예상
- 개발 속도 30-50% 향상 예상
- 쿼리 성능 20-40% 향상 예상
- 버그 발생 가능성 70-80% 감소 예상

### 최신 개선사항 (Pre-DDD)

1. **라우트 구조 모듈화**
   - 완료: routes, handlers, index 파일 분리
   - 영향: 코드 유지보수성 향상, 팀 협업 효율화

2. **현재 회차 조회 엔드포인트**
   - 완료: `/api/status/current`, `/api/status/current/discord`
   - 영향: 사용자 경험 개선, 회차 ID 기억 불필요

3. **Docker 헬스체크 엔드포인트**
   - 완료: `/health` 엔드포인트 (DB 연결 확인)
   - 영향: 컨테이너 오케스트레이션 지원, 서비스 안정성 향상

4. **Discord Bot Guild ID 지원**
   - 완료: `DISCORD_GUILD_ID` 환경변수 추가
   - 영향: 개발 중 슬래시 명령어 즉시 등록 (1시간 → 즉시)

### 높은 우선순위 (High Priority)

1. **`generation_members` 테이블 활성화**
   - 현재: 전체 멤버를 대상으로 미제출자 계산
   - 개선: 기수별 멤버만 필터링
   - 영향: 미제출자 정확도, 기수별 참여율 정확도
   - 참조: [reminder-system.md](./reminder-system.md), [status-tracking.md](./status-tracking.md)

2. **Webhook 재시도 및 모니터링**
   - 현재: 재시도 메커니즘 없음
   - 개선: 재시도 큐, 실패 알림
   - 영향: 제출 누락 방지
   - 참조: [github-webhook.md](./github-webhook.md), [discord-notifications.md](./discord-notifications.md)

### 중간 우선순위 (Medium Priority)

3. **리마인더 발송 기록 테이블**
   - 현재: 중복 발송 방지 불가
   - 개선: `reminder_logs` 테이블 추가
   - 영향: 알림 피로 방지
   - 참조: [reminder-system.md](./reminder-system.md)

4. **캐싱 레이어 추가**
   - 현재: 매번 DB 조회
   - 개선: Redis 또는 메모리 캐시
   - 영향: 응답 시간 개선, DB 부하 감소
   - 참조: [status-tracking.md](./status-tracking.md)

### 낮은 우선순위 (Low Priority)

5. **다국어 지원**
   - 현재: 하드코딩된 한국어
   - 개선: i18n 템플릿
   - 참조: [discord-notifications.md](./discord-notifications.md)

6. **메시지 템플릿 커스터마이징**
   - 현재: 고정된 메시지 형식
   - 개선: 쿼리 파라미터로 커스텀
   - 참조: [reminder-system.md](./reminder-system.md)

7. **Discord Bot 추가 명령어**
   - 현재: `/check-submission` 하나만 제공
   - 개선: `/remind`, `/stats`, `/history` 등
   - 참조: [discord-bot.md](./discord-bot.md) (TODO)

## 비즈니스 가치 요약

### 운영 효율성

- **자동화 커버리지**: 약 80%
- **시간 절감**: 월 38-60분 (약 95-97% 감소)
- **주요 자동화**: 제출 수집, 회차 생성, 알림 발송, 현황 조회

### 멤버 경험

- **즉시 피드백**: 제출 후 1초 이내 Discord 알림
- **투명성**: 제출 현황 실시간 확인 가능 (API + Discord Bot)
- **마감 준수**: 리마인더로 마감 놓침 방지
- **대화형 인터페이스**: `/check-submission` 슬래시 명령어로 간편 조회

### 기술적 안정성

- **중복 방지**: `githubCommentId` UNIQUE 제약조건
- **멱등성**: 동일 이벤트 재처리 시 안전
- **유연한 파싱**: 다양한 GitHub Issue 형식 지원

## 사용 가이드

### 경영진/운영자를 위한 요약

각 명세서 상단의 "개요 (Overview)"와 "비즈니스 가치" 섹션을 참조하세요. 2-3문장으로 핵심 가치를 설명합니다.

### 기술팀을 위한 상세 명세

"기술 사양 (Technical Specifications)", "API 명세 (API Specifications)", "데이터 구조 (Data Structure)" 섹션에서 구현에 필요한 모든 기술적 세부사항을 확인하세요.

### 비기술 이해관계자를 위한 가이드

"핵심 기능 (Core Features)"과 "사용자 시나리오 (User Scenarios)" 섹션에서 기능의 동작 방식과 사용자 경험을 이해할 수 있습니다.

---

*See YAML frontmatter for detailed metadata.*
