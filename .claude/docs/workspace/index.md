# 똥글똥글 (Lome) Workspace - 문서 포털

- **프로젝트**: 똥글똥글 (Donguel-Donguel) - 격주 글쓰기 모임 자동화 시스템
- **워크스페이스 유형**: Turborepo Monorepo
- **패키지 매니저**: pnpm
- **최종 업데이트**: 2026-01-07
- **Git Commit**: 9164ce1

---

## 🎯 문서 개요

똥글똥글 프로젝트의 모든 문서에 오신 것을 환영합니다! 이 워크스페이스는 격주 글쓰기 모임을 위한 자동화 시스템을 제공하며, **59개의 상세 문서**가 프로젝트의 모든 측면을 체계적으로 문서화하고 있습니다.

### 문서 구조

```
.claude/docs/
├── 📁 workspace/ (2개) - 워크스페이스 전체 문서
│   ├── index.md - 이 문서 (문서 포털)
│   └── architecture.md - 워크스페이스 아키텍처
│
├── 📁 apps/server/ (56개) - 서버 앱 문서
│   ├── index.md - 마스터 문서 인덱스 ⭐ 시작점
│   ├── README.md - 프로젝트 개요
│   ├── facts/ (33개) - 기술적 사실
│   ├── insights/ (11개) - 비즈니스 분석
│   └── specs/ (10개) - 기능 명세서
│
└── 📁 ubiquitous-language/ (1개) - 도메인 용어 사전
    └── ubiquitous-language.md - 유비쿼터스 언어
```

---

## 🚀 빠른 시작 가이드

### 새로운 팀원/개발자

프로젝트를 빠르게 이해하려면 다음 순서로 문서를 읽으세요:

1. **[서버 마스터 인덱스](apps/server/index.md)** ⭐ - 전체 문서의 중앙 허브
2. **[서버 README](apps/server/README.md)** - 프로젝트 개요 및 빠른 참조
3. **[유비쿼터스 언어](ubiquitous-language/ubiquitous-language.md)** - 도메인 용어 이해
4. **[Facts Index](apps/server/facts/index.md)** - 기술 구조 이해
5. **[Insights Index](apps/server/insights/index.md)** - 비즈니스 분석

### 경영진/운영자

비즈니스 가치와 운영 효율성을 이해하려면:

1. **[Insights Index](apps/server/insights/index.md)** - 비즈니스 분석 요약
2. **[운영 효율성 분석](apps/server/insights/impact/operational-efficiency.md)** - 시간 절감 효과
3. **[멀티 테넌트 아키텍처](apps/server/specs/multi-tenant-architecture.md)** - 확장성 전략

### 기술팀/아키텍트

기술적 세부사항과 구현 명세가 필요하면:

1. **[Facts Index](apps/server/facts/index.md)** - 전체 기술 문서
2. **[DDD Architecture](apps/server/specs/ddd-architecture.md)** - 아키텍처 명세
3. **[Database Schema](apps/server/facts/database/schema.md)** - 데이터베이스 구조
4. **[API Endpoints](apps/server/facts/presentation/http.md)** - REST API 명세

---

## 📊 워크스페이스 개요

### 프로젝트 소개

똥글똥글은 격주 글쓰기 모임 자동화 시스템으로, 회원들이 GitHub Issue 댓글로 블로그 글을 제출하면 시스템이 이를 자동으로 기록하고 Discord 알림을 발송합니다.

### 핵심 기능

- **자동화된 제출 수집**: GitHub Webhook으로 제출 자동 기록
- **실시간 알림**: 제출 즉시 Discord 알림 발송
- **마감 리마인더**: n8n 연동으로 자동 리마인더 발송
- **제출 현황 추적**: Discord Bot 명령어로 실시간 현황 조회
- **멀티 테넌트**: 여러 스터디 그룹(조직) 지원

### 기술 스택

- **Backend**: Hono (TypeScript web framework)
- **Database**: PostgreSQL + Drizzle ORM
- **Architecture**: Domain-Driven Design (DDD) + CQRS
- **Integrations**: GitHub Webhooks, Discord Bot/Webhooks
- **API**: REST (HTTP/HTTPS), GraphQL (Pylon)

---

## 🏗️ 워크스페이스 구조

```
lome/
├── apps/
│   └── server/              # 메인 API 서버
│       ├── src/             # 소스 코드
│       │   ├── domain/      # 도메인 계층 (DDD)
│       │   ├── application/ # 애플리케이션 계층 (CQRS)
│       │   ├── infrastructure/ # 인프라 계층
│       │   └── presentation/   # 프레젠테이션 계층
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                # 공유 패키지 (향후 추가 예정)
│
├── .claude/                 # Claude Code 설정 및 문서
│   └── docs/                # 이 문서들
│
└── package.json             # 워크스페이스 루트
```

---

## 📈 주요 성과 및 통계

### 운영 효율성
- **자동화 커버리지**: 약 80%
- **시간 절감**: 연간 104시간 (주 2시간 × 52주)
- **인건비 절감**: 약 208만원/년
- **제출률 향상**: 70% → 90% (+20%p)

### 시스템 규모
- **도메인 엔티티**: 6개
- **CQRS Commands**: 11개
- **CQRS Queries**: 13개
- **도메인 이벤트**: 5개
- **HTTP 엔드포인트**: 10개
- **Discord Bot Commands**: 11개
- **GraphQL Queries/Mutations**: 12개

### 문서 범위
- **총 문서 수**: 59개
- **총 라인 수**: ~10,000+ 라인
- **마지막 검증**: 2026-01-07

---

## 🔗 주요 문서 링크

### 서버 앱 문서 (56개)

**📋 마스터 인덱스**
- **[Server Master Index](apps/server/index.md)** ⭐ - 모든 문서의 중앙 허브 (57개 문서 연결)

**🔍 Facts - 기술적 사실 (33개)**
- [Facts Index](apps/server/facts/index.md) - Facts 전체 개요
- [Domain Layer](apps/server/facts/domain/index.md) - 도메인 엔티티 (6개)
- [Application Layer](apps/server/facts/application/index.md) - CQRS Commands/Queries (4개)
- [Infrastructure Layer](apps/server/facts/infrastructure/index.md) - 인프라 계층 (4개)
- [Presentation Layer](apps/server/facts/presentation/index.md) - API 라우트 (4개)
- [Database Schema](apps/server/facts/database/schema.md) - 데이터베이스 구조
- [Environment Config](apps/server/facts/config/environment.md) - 환경 변수

**💡 Insights - 비즈니스 분석 (11개)**
- [Insights Index](apps/server/insights/index.md) - Insights 전체 개요
- [Operations Analysis](apps/server/insights/index.md#operations-analysis---8개) - 운영 분석 (8개)
- [Impact Analysis](apps/server/insights/index.md#impact-analysis---3개) - 영향 분석 (3개)

**📋 Specs - 기능 명세서 (10개)**
- [Specs Index](apps/server/specs/index.md) - Specs 전체 개요
- [DDD Architecture](apps/server/specs/ddd-architecture.md) - DDD 아키텍처 명세
- [Multi-Tenant Architecture](apps/server/specs/multi-tenant-architecture.md) - 멀티 테넌트 명세
- [GitHub Webhook](apps/server/specs/github-webhook.md) - GitHub 웹훅 명세
- [Reminder System](apps/server/specs/reminder-system.md) - 리마인더 시스템 명세
- [Status Tracking](apps/server/specs/status-tracking.md) - 상태 추적 명세
- [Discord Notifications](apps/server/specs/discord-notifications.md) - Discord 알림 명세
- [Discord Bot Integration](apps/server/specs/discord-bot-integration.md) - Discord Bot 명세
- [GraphQL API](apps/server/specs/graphql-api.md) - GraphQL API 명세
- [Organization Management](apps/server/specs/organization-management.md) - 조직 관리 명세

### 워크스페이스 문서 (2개)

- **[Workspace Architecture](workspace/architecture.md)** - 워크스페이스 아키텍처
- **이 문서** - 문서 포털

### 유비쿼터스 언어 (1개)

- **[Ubiquitous Language](ubiquitous-language/ubiquitous-language.md)** - 도메인 전문 용어 사전

---

## 🛠️ 개발 커맨드

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작 (핫 리로드)
pnpm dev

# 전체 빌드
pnpm build

# 프로덕션 실행
pnpm start

# 데이터베이스 마이그레이션
pnpm db:generate  # 마이그레이션 파일 생성
pnpm db:migrate   # 마이그레이션 실행
pnpm db:push      # 개발용: 스키마 직접 푸시
pnpm db:studio    # Drizzle Studio 실행 (DB GUI)

# 코드 품질
pnpm lint         # ESLint 실행
pnpm lint:fix     # ESLint 자동 수정
pnpm format       # Prettier 포맷팅
pnpm format:check # 포맷팅 확인
```

---

## 🏛️ 시스템 아키텍처 개요

### DDD 4계층 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│  HTTP Routes │ GraphQL API │ Discord Bot │ Webhook Handlers    │
├─────────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                           │
│  Commands (11) │ Queries (13) │ Event Handlers (5)              │
├─────────────────────────────────────────────────────────────────┤
│                       DOMAIN LAYER                              │
│  Entities (6) │ Value Objects (20+) │ Domain Services (4)       │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  PostgreSQL │ Drizzle ORM │ Discord │ GitHub │ JWT              │
└─────────────────────────────────────────────────────────────────┘
```

### 핵심 패턴
1. **Domain-Driven Design (DDD)**: 도메인 로직을 풍부한 엔티티와 값 객체로 캡슐화
2. **CQRS**: Command(쓰기)와 Query(읽기) 분리
3. **Repository Pattern**: 도메인 리포지토리 인터페이스와 인프라 구현체 분리
4. **Domain Events**: 도메인 이벤트 발행 및 핸들링
5. **Multi-Tenancy**: 조직(organization) 단위로 데이터 격리

---

## 📚 도메인 모델

### 핵심 엔티티

```
Organization (조직)
  │
  ├── (1:N) Generation (기수)
  │     │
  │     └── (1:N) Cycle (사이클/주차)
  │           │
  │           └── (1:N) Submission (제출)
  │                 │
  │                 └── (N:1) Member (회원)
  │
  └── (1:N) OrganizationMember (조직원)
        │
        └── (N:1) Member
```

### 도메인 용어

자세한 도메인 용어 정의는 **[유비쿼터스 언어](ubiquitous-language/ubiquitous-language.md)** 문서를 참조하세요.

---

## 🎯 주요 워크플로우

### 1. 제출 기록 흐름

```
GitHub Issue Comment
  ↓
POST /webhook/github (issue_comment event)
  ↓
RecordSubmissionCommand (Application Layer)
  ├→ Find Cycle by GitHub Issue URL
  ├→ Find Member by GitHub Username
  ├→ Verify Member is Active in Organization
  ├→ Validate No Duplicate
  ├→ Create Submission Entity
  └→ Send Discord Notification
```

### 2. 사이클 생성 흐름

```
GitHub Issue Created
  ↓
POST /webhook/github (issues event)
  ↓
CreateCycleCommand
  ├→ Parse Week from Title
  ├→ Parse Deadline from Body
  ├→ Find Organization & Active Generation
  ├→ Validate No Duplicate Week
  └→ Create Cycle Entity
```

### 3. Discord Bot 제출 현황 조회

```
Discord Slash Command (/check-submission)
  ↓
GetCycleStatusQuery.getCurrentCycle()
  ↓
GetCycleStatusQuery.getCycleParticipantNames()
  ↓
Discord Message Formatting
  ↓
Send Ephemeral Reply
```

---

## 🚀 배포 및 인프라

### 환경 변수

```env
DATABASE_URL=postgresql://localhost:5432/dongueldonguel
DISCORD_BOT_TOKEN=MTIz...
DISCORD_CLIENT_ID=123456789
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

### 데이터베이스

- **엔진**: PostgreSQL 15+
- **ORM**: Drizzle ORM
- **마이그레이션**: Drizzle Kit
- **테이블**: 6개 (organizations, members, generations, cycles, submissions, organization_members)

---

## 📝 문서 사용 가이드

### 경영진/운영자를 위한 가이드

비즈니스 가치와 운영 효율성을 이해하려면 다음 문서를 참조하세요:

1. **[Insights Index](apps/server/insights/index.md)** - 비즈니스 분석 요약
2. **[운영 효율성 분석](apps/server/insights/impact/operational-efficiency.md)** - 시간 절감 효과
3. **[멀티 테넌트 아키텍처](apps/server/specs/multi-tenant-architecture.md)** - 확장성 전략

각 명세서 상단의 "개요 (Overview)"와 "비즈니스 가치" 섹션을 참조하세요. 2-3문장으로 핵심 가치를 설명합니다.

### 기술팀을 위한 가이드

기술적 세부사항과 구현 명세가 필요하면:

1. **[Facts Index](apps/server/facts/index.md)** - 전체 기술 문서
2. **[DDD Architecture](apps/server/specs/ddd-architecture.md)** - 아키텍처 명세
3. **[Database Schema](apps/server/facts/database/schema.md)** - 데이터베이스 구조
4. **[API Endpoints](apps/server/facts/presentation/http.md)** - REST API 명세

"기술 사양 (Technical Specifications)", "API 명세 (API Specifications)", "데이터 구조 (Data Structure)" 섹션에서 구현에 필요한 모든 기술적 세부사항을 확인하세요.

### 신규 개발자를 위한 가이드

프로젝트를 빠르게 이해하려면 다음 순서로 문서를 읽으세요:

1. **[서버 README](apps/server/README.md)** - 프로젝트 개요
2. **[서버 마스터 인덱스](apps/server/index.md)** - 전체 문서 개요
3. **[유비쿼터스 언어](ubiquitous-language/ubiquitous-language.md)** - 도메인 용어 이해
4. **[Facts Index](apps/server/facts/index.md)** - 기술 구조 이해
5. **[Domain Index](apps/server/facts/domain/index.md)** - 도메인 모델 이해
6. **[Application Index](apps/server/facts/application/index.md)** - CQRS 패턴 이해
7. **[Specs Index](apps/server/specs/index.md)** - 기능 명세 확인

---

## 🎯 다음 단계 및 권장사항

### 단기 (1-3개월)
1. **모니터링 강화**: GitHub webhook 성공/실패 로그, Discord 알림 발송 추적
2. **권한 관리 구현**: `/approve-member`에 역할 검증 로직 추가
3. **에러 핸들링 개선**: 사용자 친화적 에러 메시지, 재시도 가능한 에러 표시

### 중기 (3-6개월)
1. **데이터 대시보드**: 제출률 추이 그래프, 개인별 통계, 기수 비교 분석
2. **리마인더 최적화**: AB 테스트로 최적 빈도 찾기, 개인별 리마인더 시간 설정
3. **모바일 경험 개선**: Discord Bot 모바일 UX 최적화, PWA 도입

### 장기 (6-12개월)
1. **플랫폼화**: 멀티 테넌트 아키텍처 강화, 조직별 독립 Discord 채널 지원
2. **AI 기능 도입**: 제출 글 자동 요약, 피드백 생성 (GPT-4), 플래그리즘 검출
3. **수익화**: 프리미엄 구독 모델 도입, 기업 교육 프로그램 판매

---

## 📞 문서 관리 정보

- **문서 버전**: 3.0.0
- **생성일**: 2026-01-05
- **최종 검증**: 2026-01-07
- **Git Commit**: 9164ce1283112dd34a47ff830c0679e7128506d5
- **다음 리뷰일**: 2026-02-07
- **문서 관리자**: Claude Code (feature-orchestrator)

---

## 🔗 외부 리소스

- **GitHub Repository**: [github.com/dongueldonguel/lome](https://github.com/dongueldonguel/lome)
- **Discord Server**: (내부용)
- **n8n Workflows**: (내부용)

---

## 📚 문서 라이선스

이 문서는 똥글똥글 프로젝트의 내부 문서입니다. 프로젝트 팀원과 이해관계자에게 공개됩니다.

---

*이 문서 포털은 59개의 상세 문서로 연결되는 중앙 허브입니다. 원하는 정보를 빠르게 찾을 수 있도록 구조화되어 있습니다.*
