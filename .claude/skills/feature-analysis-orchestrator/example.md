# Feature Analysis Orchestrator Examples

실제 사용 예제들을 통해 스킬의 활용 방법을 설명합니다.

## Example 1: Complete Codebase Analysis

### User Request
```
전체 코드베이스 분석해서 기능 명세서 작성해줘
```

### Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Codebase Extraction (@codebase-extractor)         │
├─────────────────────────────────────────────────────────────┤
│  Task: Analyze entire codebase structure                    │
│  Output: .claude/docs/apps/server/facts/                    │
│                                                             │
│  facts/                                                     │
│  ├── domain/                                                │
│  │   ├── member.md      # Member 도메인 엔티티, 값 객체    │
│  │   ├── generation.md  # Generation 도메인                │
│  │   ├── cycle.md       # Cycle 도메인                     │
│  │   └── submission.md  # Submission 도메인                │
│  ├── application/                                           │
│  │   ├── commands.md       # Command 목록 및 구현          │
│  │   ├── queries.md        # Query 목록 및 구현            │
│  │   └── event-handlers.md # Event Handler 목록            │
│  ├── infrastructure/                                        │
│  │   ├── persistence.md  # DB 스키마, Repository 구현      │
│  │   └── external.md     # Discord, GitHub 연동            │
│  ├── presentation/                                          │
│  │   ├── http.md        # HTTP routes                      │
│  │   ├── discord.md     # Discord bot                      │
│  │   └── graphql.md     # GraphQL API                      │
│  ├── routes/                                                │
│  │   ├── github.md      # GitHub webhook route             │
│  │   ├── reminder.md    # Reminder API routes              │
│  │   └── status.md      # Status API routes                │
│  └── index.md         # 전체 팩트 요약                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Business Context (@business-context-analyst)      │
├─────────────────────────────────────────────────────────────┤
│  Task: Interpret technical facts in business context        │
│  Output: .claude/docs/apps/server/insights/                 │
│                                                             │
│  insights/                                                  │
│  ├── operations/                                            │
│  │   ├── github-webhook.md        # GitHub 웹훅 자동화 분석│
│  │   ├── discord-notifications.md # Discord 알림 분석      │
│  │   ├── reminder-system.md       # 리마인더 시스템 분석   │
│  │   ├── status-tracking.md       # 상태 추적 분석         │
│  │   ├── domain-model.md          # 도메인 모델 분석       │
│  │   └── cqrs-pattern.md          # CQRS 패턴 분석         │
│  ├── impact/                                                │
│  │   ├── member-experience.md     # 멤버 경험 영향 분석    │
│  │   └── operational-efficiency.md # 운영 효율성 분석     │
│  └── index.md         # 전체 인사이트 요약                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Feature Specification (@feature-spec-writer)      │
├─────────────────────────────────────────────────────────────┤
│  Task: Create comprehensive feature specs                   │
│  Output: .claude/docs/apps/server/specs/                    │
│                                                             │
│  specs/                                                     │
│  ├── github-webhook.md      # GitHub 웹훅 기능 명세        │
│  ├── reminder-system.md     # 리마인더 시스템 명세         │
│  ├── status-tracking.md     # 상태 추적 명세               │
│  ├── discord-notifications.md # Discord 알림 명세          │
│  ├── ddd-architecture.md    # DDD 아키텍처 명세            │
│  ├── domain-services.md     # 도메인 서비스 명세           │
│  └── index.md            # 전체 명세서 요약                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Coordination (@feature-orchestrator)              │
├─────────────────────────────────────────────────────────────┤
│  Task: Synthesize and validate all outputs                  │
│  Output: Update index.md files                              │
│                                                             │
│  - facts/index.md: 전체 팩트 요약 및 메타데이터            │
│  - insights/index.md: 전체 인사이트 요약 및 메타데이터     │
│  - specs/index.md: 전체 명세서 요약 및 메타데이터          │
└─────────────────────────────────────────────────────────────┘
```

### Generated Output Examples

#### facts/domain/member.md
```markdown
---
metadata:
  entity: Member
  aggregate_root: true
  value_objects: [GithubUsername, DiscordId]
  created_at: "2026-01-07T10:00:00Z"
  git_commit: "abc123"
---

# Member 도메인

## 개요
회원을 나타내는 도메인 엔티티. GitHub username과 Discord ID로 식별됩니다.

## 엔티티 구조
- `id`: UUID (PK)
- `github`: GithubUsername (Value Object)
- `discordId`: DiscordId (Value Object)
- `name`: string

## 값 객체
### GithubUsername
- 검증: GitHub username 형식 (알파벳, 숫자, 하이픈)
- 길이: 1-39자
- 불변성 보장

### DiscordId
- 검증: Discord snowflake ID
- 형식: 18-19자리 숫자

## 리포지토리 인터페이스
```typescript
interface MemberRepository {
  findByGithub(username: GithubUsername): Promise<Member | null>
  findAll(): Promise<Member[]>
  save(member: Member): Promise<void>
}
```

## 도메인 서비스
- `MemberService.validateMember()`: 회원 유효성 검증
```

#### insights/operations/github-webhook.md
```markdown
---
metadata:
  based_on_facts: "../facts/github.md"
  created_at: "2026-01-07T12:00:00Z"
  git_commit: "abc123"
---

# GitHub 웹훅 자동화 분석

## Executive Summary
GitHub 웹훅을 통해 제출 수집 및 회차 생성을 100% 자동화하여 운영 시간을 95% 이상 절감합니다.

## 비즈니스 가치
### Before (수동 운영)
- 제출 확인: 10-15분/회차 (GitHub Issue 댓글 수동 확인)
- 회차 생성: 5분/회차 (Issue 및 DB 레코드 수동 생성)
- **총 시간**: 15-20분/회차

### After (자동화 후)
- 제출 확인: 0분 (웹훅 실시간 처리)
- 회차 생성: 0분 (Issue 생성 이벤트 자동 처리)
- **총 시간**: 0분 (모니터링만)

### ROI
- 시간 절감: 15-20분/회차
- 월간 절감: 30-40분 (격주 2회 기준)
- 연간 절감: 6-8시간

## 사용자 시나리오
### 시나리오 1: 제출 처리
1. 멤버가 GitHub Issue에 댓글로 블로그 URL 작성
2. GitHub가 webhook 이벤트 전송
3. 시스템이 댓글에서 URL 추출
4. 제출 기록 자동 생성
5. Discord 알림 발송

### 시나리오 2: 회차 생성
1. 운영자가 새로운 회차용 GitHub Issue 생성
2. GitHub가 issues 이벤트 전송
3. 시스템이 Week 패턴 파싱 (e.g., "Week 3")
4. 마감일 계산 (주차 * 7일)
5. 회차 레코드 자동 생성

## 비즈니스 규칙
1. **중복 제출 방지**: githubCommentId로 중복 검사
2. **URL 검증**: 첫 번째 http/https 링크만 추출
3. **회차 매칭**: GitHub Issue URL로 정확한 회차 식별
4. **Week 패턴**: Issue 제목에서 "Week N" 패턴 추출

## 기회 및 개선사항
1. **웹훅 재시도**: 현재 재시도 메커니즘 없음
2. **실패 알림**: 웹훅 실패 시 운영자에게 알림 필요
3. **중복 전송 처리**: GitHub 웹훅 중복 전송 시나리오 대응
```

#### specs/github-webhook.md
```markdown
---
metadata:
  based_on_facts: "../facts/github.md"
  based_on_insights: "../insights/operations/github-webhook.md"
  created_at: "2026-01-07T14:00:00Z"
  git_commit: "abc123"
---

# GitHub Webhook Handler 기능 명세서

## 개요
GitHub webhook을 통해 제출 수집 및 회차 생성을 자동화하는 기능입니다.

## 비즈니스 가치
- 운영 시간 절감: 15-20분/회차 (95% 이상)
- 실시간 처리: 제출 후 1초 이내 Discord 알림
- 인간 오러 방지: 수동 입력 오류 제거

## 사용자 스토리
### US-1: 제출 자동 수집
**As a** 멤버,
**I want to** GitHub Issue에 댓글로 블로그 URL을 제출,
**So that** 내 제출이 자동으로 기록되고 그룹에 알려진다.

**Acceptance Criteria**:
- GitHub Issue 댓글 작성 시 자동으로 제출 기록 생성
- 첫 번째 http/https 링크만 추출
- 동일 댓글 재처리 시 중복 방지
- 제출 완료 시 Discord 알림 발송

### US-2: 회차 자동 생성
**As a** 운영자,
**I want to** GitHub Issue 생성 시 회차가 자동으로 생성,
**So that** 수동으로 DB를 수정하지 않아도 된다.

**Acceptance Criteria**:
- GitHub Issue 생성 시 자동으로 회차 레코드 생성
- 제목에서 "Week N" 패턴 추출
- 마감일 자동 계산 (주차 * 7일)
- 생성된 회차와 Issue 연결

## 기술 사양

### DDD 컨텍스트
**Application Layer**:
- `RecordSubmissionCommand`: 제출 기록 Command
- `CreateCycleCommand`: 회차 생성 Command
- `SubmissionEventHandler`: 제출 이벤트 핸들러

**Domain Layer**:
- `Submission` 엔티티
- `Cycle` 엔티티
- `GithubUsername`, `BlogUrl` 값 객체

**Domain Events**:
- `SubmissionRecorded`: 제출 기록됨
- `CycleCreated`: 회차 생성됨

### API 명세
#### POST /webhook/github

**Headers**:
- `X-GitHub-Event`: `issue_comment` | `issues`
- `X-Hub-Signature-256`: HMAC signature (optional)

**Request Body** (GitHub webhook payload):
```json
{
  "action": "created",
  "issue": {
    "url": "https://github.com/...",
    "number": 123,
    "title": "Week 3 Submission"
  },
  "comment": {
    "id": 123456,
    "body": "제출합니다! https://blog.example.com/post"
  },
  "sender": {
    "login": "username"
  }
}
```

**Response**:
- `200 OK`: 성공
- `400 Bad Request`: 잘못된 요청
- `409 Conflict`: 중복 제출

### 데이터 모델
#### submissions 테이블
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY,
  cycleId UUID NOT NULL REFERENCES cycles(id),
  memberId UUID NOT NULL REFERENCES members(id),
  blogUrl TEXT NOT NULL,
  githubCommentId BIGINT UNIQUE NOT NULL,
  submittedAt TIMESTAMP DEFAULT NOW()
);
```

## 요구사항

### 기능 요구사항
1. **FR-1**: GitHub webhook 수신
2. **FR-2**: Issue 댓글에서 URL 추출
3. **FR-3**: 중복 제출 방지
4. **FR-4**: 제출 기록 생성
5. **FR-5**: 도메인 이벤트 발행
6. **FR-6**: Discord 알림 발송 (이벤트 핸들러)

### 비기능 요구사항
1. **NFR-1**: 웹훅 처리 지연 < 1초
2. **NFR-2**: 중복 이벤트 멱등성 보장
3. **NFR-3**: GitHub signature 검증 (optional)

## Edge Cases
1. **URL 없는 댓글**: 무료 또는 에러 반환
2. **잘못된 Issue URL**: 일치하는 회차 없음 → 404
3. **존재하지 않는 멤버**: 자동으로 회원 생성 또는 에러
4. **중복 githubCommentId**: "Already submitted" 메시지
5. **웹훅 중복 전송**: 멱등성으로 안전 처리
```

## Example 2: Specific Feature Analysis

### User Request
```
GitHub 웹훅 제출 흐름만 분석해줘
```

### Targeted Execution

```
@codebase-extractor
  Target: src/presentation/http/github.ts
         src/application/commands/recordSubmission.ts
         src/domain/submission/
         src/infrastructure/external/github.ts
  Focus: Submission flow only

  ↓ Output:
  facts/routes/github.md (updated)
  facts/application/commands.md (updated)
  facts/domain/submission.md (updated)

@business-context-analyst
  Input: facts related to submission
  Focus: Submission business rules, user scenarios

  ↓ Output:
  insights/operations/github-webhook.md (updated)

@feature-spec-writer
  Input: Technical + Business context
  Focus: Single feature spec

  ↓ Output:
  specs/github-webhook.md (updated)
```

### Output: Updated Files Only

기존 파일들이 업데이트되고, 관련된 index.md 파일들도 재작성됩니다.

## Example 3: Quick Analysis

### User Request
```
빠르게 핵심 기능만 파악하고 싶어
```

### Quick Mode Execution

```bash
/skill feature-analysis-orchestrator depth=quick
```

**Result**:
- index.md 파일만 업데이트
- 세부 파일은 생성하지 않음
- 실행 시간: ~30초

### facts/index.md (quick mode)
```markdown
## 핵심 기능 개요
- 4개 도메인: Member, Generation, Cycle, Submission
- 4개 Command: RecordSubmission, CreateMember, CreateCycle, CreateGeneration
- 8개 Query: GetCycleStatus, GetReminderTargets, ...
- 5개 도메인 이벤트

## 주요 엔드포인트
- POST /webhook/github - GitHub webhook
- GET /api/reminder - 리마인더 조회
- GET /api/status/:cycleId - 상태 조회
```

## Example 4: Thorough Analysis

### User Request
```
프로젝트 인수인계용 완전한 문서가 필요해
```

### Thorough Mode Execution

```bash
/skill feature-analysis-orchestrator depth=thorough
```

**Result**:
- 모든 세부 파일 생성/업데이트
- Edge cases, 테스트 시나리오 포함
- 메트릭, 모니터링 가이드 포함
- 실행 시간: ~5-10분

## Tips

1. **Start with quick mode** for understanding, then re-run with medium/thorough
2. **Check existing structure** before running to understand what will be updated
3. **Use git diff** to see what changed after the skill runs
4. **Re-run after major changes** to keep docs current
5. **Focus on specific features** when working on individual features
