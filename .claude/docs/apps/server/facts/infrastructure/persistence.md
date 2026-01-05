# Infrastructure Layer - Persistence (DB 스키마 및 리포지토리)

---
metadata:
  layer: Infrastructure
  component: Persistence
  orm: Drizzle ORM
  database: PostgreSQL
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

Persistence 계층은 데이터베이스 스키마와 리포지토리 구현을 포함합니다. Drizzle ORM을 사용하며, Domain 계층에서 정의한 리포지토리 인터페이스를 구현합니다.

## Database Schema

- **Location**: `src/infrastructure/persistence/drizzle-db/schema.ts` (L1-L103)
- **Purpose**: Drizzle ORM 스키마 정의

### 테이블 목록

| 테이블 | 목적 | Location |
|--------|------|----------|
| `members` | 회원 정보 | L12-L18 |
| `generations` | 기수 정보 | L21-L27 |
| `cycles` | 주차 사이클 | L30-L46 |
| `generation_members` | 기수-회원 조인 | L49-L67 |
| `submissions` | 제출 기록 | L70-L90 |

### members

- **Location**: `src/infrastructure/persistence/drizzle-db/schema.ts` (L12-L18)

```typescript
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  github: text('github').notNull().unique(),
  discordId: text('discord_id').unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Constraints**:
- `github` - UNIQUE, NOT NULL
- `discord_id` - UNIQUE, nullable
- `name` - NOT NULL

### generations

- **Location**: `src/infrastructure/persistence/drizzle-db/schema.ts` (L21-L27)

```typescript
export const generations = pgTable('generations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startedAt: timestamp('started_at').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Constraints**:
- `name` - NOT NULL
- `started_at` - NOT NULL
- `is_active` - NOT NULL, default true

### cycles

- **Location**: `src/infrastructure/persistence/drizzle-db/schema.ts` (L30-L46)

```typescript
export const cycles = pgTable(
  'cycles',
  {
    id: serial('id').primaryKey(),
    generationId: integer('generation_id')
      .notNull()
      .references(() => generations.id),
    week: integer('week').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    githubIssueUrl: text('github_issue_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    generationIdx: index('cycles_generation_idx').on(table.generationId),
  })
);
```

**Constraints**:
- `generation_id` - FK → generations.id, NOT NULL
- `week` - NOT NULL
- `start_date` - NOT NULL
- `end_date` - NOT NULL
- `github_issue_url` - nullable

**Indexes**:
- `cycles_generation_idx` - generationId

### generation_members

- **Location**: `src/infrastructure/persistence/drizzle-db/schema.ts` (L49-L67)

```typescript
export const generationMembers = pgTable(
  'generation_members',
  {
    id: serial('id').primaryKey(),
    generationId: integer('generation_id')
      .notNull()
      .references(() => generations.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    generationMemberIdx: index('gen_members_gen_member_idx').on(
      table.generationId,
      table.memberId
    ),
  })
);
```

**Constraints**:
- `generation_id` - FK → generations.id, NOT NULL
- `member_id` - FK → members.id, NOT NULL
- `joined_at` - NOT NULL, default now

**Indexes**:
- `gen_members_gen_member_idx` - (generationId, memberId)

### submissions

- **Location**: `src/infrastructure/persistence/drizzle-db/schema.ts` (L70-L90)

```typescript
export const submissions = pgTable(
  'submissions',
  {
    id: serial('id').primaryKey(),
    cycleId: integer('cycle_id')
      .notNull()
      .references(() => cycles.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    url: text('url').notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    githubCommentId: text('github_comment_id').unique(),
  },
  (table) => ({
    cycleMemberIdx: index('submissions_cycle_member_idx').on(
      table.cycleId,
      table.memberId
    ),
  })
);
```

**Constraints**:
- `cycle_id` - FK → cycles.id, NOT NULL
- `member_id` - FK → members.id, NOT NULL
- `url` - NOT NULL
- `submitted_at` - NOT NULL, default now
- `github_comment_id` - UNIQUE, nullable

**Indexes**:
- `submissions_cycle_member_idx` - (cycleId, memberId)

## Repository Implementations

### DrizzleMemberRepository

- **Location**: `src/infrastructure/persistence/drizzle/member.repository.impl.ts` (L9-L95)
- **Purpose**: MemberRepository 인터페이스 구현

#### Methods

| Method | Implementation |
|--------|----------------|
| `save(member)` | INSERT (id=0) 또는 UPDATE |
| `findById(id)` | SELECT WHERE id = ? |
| `findByGithubUsername(username)` | SELECT WHERE github = ? |
| `findAll()` | SELECT * |
| `findByDiscordId(discordId)` | SELECT WHERE discord_id = ? |

#### Entity Mapping

```typescript
private mapToEntity(row): Member {
  return Member.reconstitute({
    id: row.id,
    github: row.github,
    name: row.name,
    discordId: row.discordId ?? undefined,
    createdAt: row.createdAt,
  });
}
```

### DrizzleGenerationRepository

- **Location**: `src/infrastructure/persistence/drizzle/generation.repository.impl.ts`
- **Purpose**: GenerationRepository 인터페이스 구현

#### Methods

| Method | Implementation |
|--------|----------------|
| `save(generation)` | INSERT 또는 UPDATE |
| `findById(id)` | SELECT WHERE id = ? |
| `findActive()` | SELECT WHERE is_active = true LIMIT 1 |
| `findAll()` | SELECT * |

### DrizzleCycleRepository

- **Location**: `src/infrastructure/persistence/drizzle/cycle.repository.impl.ts`
- **Purpose**: CycleRepository 인터페이스 구현

#### Methods

| Method | Implementation |
|--------|----------------|
| `save(cycle)` | INSERT 또는 UPDATE |
| `findById(id)` | SELECT WHERE id = ? |
| `findByIssueUrl(url)` | SELECT WHERE github_issue_url = ? |
| `findByGenerationAndWeek(genId, week)` | SELECT WHERE generation_id = ? AND week = ? |
| `findByGeneration(genId)` | SELECT WHERE generation_id = ? |
| `findActiveCyclesByGeneration(genId)` | SELECT WHERE generation_id = ? AND start_date <= NOW() AND end_date >= NOW() |
| `findCyclesWithDeadlineInRange(genId, start, end)` | SELECT WHERE generation_id = ? AND end_date BETWEEN ? AND ? |

### DrizzleSubmissionRepository

- **Location**: `src/infrastructure/persistence/drizzle/submission.repository.impl.ts`
- **Purpose**: SubmissionRepository 인터페이스 구현

#### Methods

| Method | Implementation |
|--------|----------------|
| `save(submission)` | INSERT 또는 UPDATE |
| `findById(id)` | SELECT WHERE id = ? |
| `findByCycleAndMember(cycleId, memberId)` | SELECT WHERE cycle_id = ? AND member_id = ? |
| `findByGithubCommentId(commentId)` | SELECT WHERE github_comment_id = ? |
| `findByCycle(cycleId)` | SELECT WHERE cycle_id = ? |
| `findByCycleId(cycleId)` | SELECT WHERE cycle_id = ? |
| `findByMember(memberId)` | SELECT WHERE member_id = ? |
| `delete(id)` | DELETE WHERE id = ? |

## Database Connection

### DB Instance

- **Location**: `src/infrastructure/lib/db.ts` (L1-L13)
- **Purpose**: Drizzle DB 인스턴스

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../persistence/drizzle-db/schema';

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

## 데이터 모델 관계도

```
generations (1)
    ↓
    | (1:N)
    ↓
cycles (1)
    ↓
    | (1:N)
    ↓
submissions (N)
    ↓
    | (N:1)
    ↓
members (N)

generation_members (N:M)
    ↓ (N:1)
generations
    ↓ (N:1)
members
```

## Migration

```bash
# Migration 생성
pnpm db:generate

# Migration 실행
pnpm db:migrate

# 스키마 직접 push (개발용)
pnpm db:push

# Drizzle Studio 실행
pnpm db:studio
```

## Type Inference

Drizzle은 스키마에서 TypeScript 타입을 자동으로 추론합니다:

```typescript
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
```
