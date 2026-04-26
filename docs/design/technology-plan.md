# Study Operations 기술 구현 계획

## 1. 추천 스택

현재 `notification` repo의 방향을 유지하면서 확장한다.

```text
TypeScript monorepo
Pylon / Hono server
Drizzle ORM
PostgreSQL
pg-boss 또는 transactional outbox 기반 worker
Octokit
Discord.js
Zod
Vitest
```

## 2. 아키텍처

`Modular Monolith + Hexagonal Architecture`를 사용한다.

```text
presentation
  -> application
    -> domain
    -> infrastructure
```

### Domain Layer

- Aggregate
- Entity
- Value Object
- Domain Service
- Domain Event
- Repository Port
- 외부 라이브러리 의존 금지

### Application Layer

- Use Case / Command Handler
- Transaction boundary
- Repository 조합
- 권한 검사
- Domain Event -> Outbox 기록

### Infrastructure Layer

- Drizzle repository 구현
- GitHub adapter
- Discord adapter
- URL metadata fetcher
- Job queue / outbox dispatcher

### Presentation Layer

- GitHub webhook HTTP route
- Discord slash command adapter
- GraphQL/REST query endpoint

## 3. 디렉터리 구조

단기적으로는 기존 구조를 유지하면서 신규 bounded context를 추가한다.

```text
apps/server/src/
  domain/
    study-operations/
      study-operations.domain.ts
      index.ts
  application/
    study-operations/
      commands/
      queries/
      ports/
  infrastructure/
    persistence/
      drizzle-db/
        schema.ts
      drizzle/
    github/
    discord/
    jobs/
    metadata/
  presentation/
    http/
    discord/
    graphql/
```

장기적으로 schema가 커지면 아래처럼 분리한다.

```text
apps/server/src/infrastructure/persistence/drizzle-db/schema/
  studies.ts
  generations.ts
  cycles.ts
  members.ts
  participants.ts
  submissions.ts
  reporting.ts
  integrations.ts
  events.ts
  index.ts
```

## 4. Database 전략

### PostgreSQL + Drizzle

- 기존 `serial` integer ID convention 유지
- additive migration 우선
- 기존 테이블/컬럼 rename/drop 금지
- 신규 모델은 새 테이블/nullable column으로 추가
- backfill 후 repository dual-read/dual-write 전환

### 핵심 테이블

```text
organizations            # 기존 tenant/study group root
studies                  # 신규 Study business concept
generations              # 기존 + status/project projection fields
cycles                   # 기존 + status/issue projection fields
members                  # 기존 Discord-backed member
member_identities        # 신규 Discord/GitHub external identity
generation_participants  # 신규 participant application/approval/status
generation_participant_roles
submissions              # 기존 + status/timing/accessibility/source fields
submission_candidates
submission_metadata
cycle_obligations
participant_cycle_results
cycle_submission_stats
participant_activity_stats
github_drift_logs
notification_logs
outbox_events
domain_events
```

## 5. GitHub 연동

### Outbound DB -> GitHub

- `GenerationPlanned` -> GitHub Project 생성
- `CycleScheduled` -> GitHub Issue 생성
- `CycleOpened` -> Project status `In progress`
- `CycleClosed` -> Project status `In review`, Issue close
- `CycleCompleted` -> Project status `Done`

### Inbound GitHub -> DB

반영:

- comment created -> Submission 생성
- comment edited -> Submission update/withdraw
- comment deleted -> Submission `WITHDRAWN`
- issue closed -> `CycleClosed`

Drift:

- Project status/date 변경
- Issue title/body 변경
- Issue label 변경

## 6. Discord 연동

명령어는 모두 노출하고 실행 시 권한 체크한다.

```text
/기수신청
/기수신청승인
/기수신청거절
/깃헙계정연결
/회차현황
/미제출자
/지각제출승인
/제출통계
/회차열기
/회차마감
/기수종료
/비활성해제
/동기화상태
/동기화재시도
```

알림은 공개 채널에 보낸다.

## 7. Background Job / Outbox

초기에는 `outbox_events` 테이블을 먼저 만든다. 이후 필요하면 `pg-boss`를 도입한다.

Job 후보:

```text
github.createProject
github.createIssue
github.syncProjection
github.detectDrift
discord.sendNotification
metadata.fetch
cycle.open
cycle.close
cycle.reminder
reporting.calculateCycleStats
participant.markInactive
```

## 8. 테스트 전략

- Domain invariant: Vitest unit test
- Application command: fake repository 기반 unit/integration test
- Drizzle repository: test DB integration test
- GitHub/Discord adapter: mock client contract test
- Webhook: payload fixture test

우선순위:

1. Generation freeze
2. Cycle period immutability
3. Participant multi-role / approved participant submission
4. 3 consecutive missed cycles -> INACTIVE
5. Reminder offsets
6. GitHub issue close -> CycleClosed
7. GitHub manual edit -> drift

## 9. 배포 구조

```text
web process
  - HTTP API
  - GitHub webhook
  - GraphQL/REST query

worker process
  - outbox dispatcher
  - GitHub/Discord sync
  - reminder schedule
  - metadata fetch
```

운영 DB는 PostgreSQL. MVP는 Railway/Fly.io + Neon/Railway Postgres가 적합하다.
```
