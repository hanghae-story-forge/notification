# Database Schema

- **Scope**: Drizzle ORM PostgreSQL 스키마 정의
- **Source of Truth**: `src/db/schema.ts`
- **Last Verified**: 2025-01-05
- **Repo Ref**: f32413325de67a3ad1bde6649d16474d236d164b

---
metadata:
  version: "1.0.0"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2025-01-05T10:00:00Z"
  git_commit: "f32413325de67a3ad1bde6649d16474d236d164b"
  source_files:
    src/db/schema.ts:
      git_hash: "b8c7e13f1557a68a220c9b964d09d2cc741be34e"
      source_exists: true
---

## members

- **Location**: `src/db/schema.ts` (L4-10)
- **Purpose**: 글쓰기 모임 멤버 정보

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY, AUTO INCREMENT | 멤버 고유 ID |
| `github` | `text` | NOT NULL, UNIQUE | GitHub username (멤버 식별용) |
| `discord_id` | `text` | UNIQUE | Discord 사용자 ID (可选) |
| `name` | `text` | NOT NULL | 실명 또는 닉네임 |
| `created_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 가입일 |

### Indexes

- `members_github_key`: UNIQUE (`github`)

### TypeScript Types

```typescript
type Member = {
  id: number;
  github: string;
  discordId: string | null;
  name: string;
  createdAt: Date;
};

type NewMember = {
  id?: number;
  github: string;
  discordId?: string | null;
  name: string;
  createdAt?: Date;
};
```

### Evidence

```typescript
// src/db/schema.ts:4-10
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  github: text('github').notNull().unique(),
  discordId: text('discord_id').unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## generations

- **Location**: `src/db/schema.ts` (L13-19)
- **Purpose**: 글쓰기 모임 기수 (예: "똥글똥글 1기", "똥글똥글 2기")

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY, AUTO INCREMENT | 기수 고유 ID |
| `name` | `text` | NOT NULL | 기수 이름 (예: "똥글똥글 1기") |
| `started_at` | `timestamp` | NOT NULL | 기수 시작일 |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | 활성화 상태 |
| `created_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 레코드 생성일 |

### TypeScript Types

```typescript
type Generation = {
  id: number;
  name: string;
  startedAt: Date;
  isActive: boolean;
  createdAt: Date;
};

type NewGeneration = {
  id?: number;
  name: string;
  startedAt: Date;
  isActive?: boolean;
  createdAt?: Date;
};
```

### Evidence

```typescript
// src/db/schema.ts:13-19
export const generations = pgTable('generations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startedAt: timestamp('started_at').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## cycles

- **Location**: `src/db/schema.ts` (L22-32)
- **Purpose**: 각 기수의 주차별 회차 (예: 1주차, 2주차...)

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY, AUTO INCREMENT | 사이클 고유 ID |
| `generation_id` | `integer` | NOT NULL, FK → generations.id | 소속 기수 |
| `week` | `integer` | NOT NULL | 주차 번호 (1, 2, 3...) |
| `start_date` | `timestamp` | NOT NULL | 회차 시작일 |
| `end_date` | `timestamp` | NOT NULL | 회차 마감일 |
| `github_issue_url` | `text` | NULLABLE | GitHub Issue URL (제출용) |
| `created_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 레코드 생성일 |

### Foreign Keys

- `generation_id` → `generations(id)` (CASCADE not specified)

### Indexes

- `cycles_generation_idx`: (`generation_id`)

### TypeScript Types

```typescript
type Cycle = {
  id: number;
  generationId: number;
  week: number;
  startDate: Date;
  endDate: Date;
  githubIssueUrl: string | null;
  createdAt: Date;
};

type NewCycle = {
  id?: number;
  generationId: number;
  week: number;
  startDate: Date;
  endDate: Date;
  githubIssueUrl?: string | null;
  createdAt?: Date;
};
```

### Evidence

```typescript
// src/db/schema.ts:22-32
export const cycles = pgTable('cycles', {
  id: serial('id').primaryKey(),
  generationId: integer('generation_id').notNull().references(() => generations.id),
  week: integer('week').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  githubIssueUrl: text('github_issue_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  generationIdx: index('cycles_generation_idx').on(table.generationId),
}));
```

---

## generation_members

- **Location**: `src/db/schema.ts` (L35-42)
- **Purpose**: 기수-멤버 다대다 조인 테이블

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY, AUTO INCREMENT | 조인 레코드 ID |
| `generation_id` | `integer` | NOT NULL, FK → generations.id | 기수 ID |
| `member_id` | `integer` | NOT NULL, FK → members.id | 멤버 ID |
| `joined_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 가입일 |

### Foreign Keys

- `generation_id` → `generations(id)`
- `member_id` → `members(id)`

### Indexes

- `gen_members_gen_member_idx`: (`generation_id`, `member_id`)

### TypeScript Types

```typescript
type GenerationMember = {
  id: number;
  generationId: number;
  memberId: number;
  joinedAt: Date;
};

type NewGenerationMember = {
  id?: number;
  generationId: number;
  memberId: number;
  joinedAt?: Date;
};
```

### Evidence

```typescript
// src/db/schema.ts:35-42
export const generationMembers = pgTable('generation_members', {
  id: serial('id').primaryKey(),
  generationId: integer('generation_id').notNull().references(() => generations.id),
  memberId: integer('member_id').notNull().references(() => members.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  generationMemberIdx: index('gen_members_gen_member_idx').on(table.generationId, table.memberId),
}));
```

---

## submissions

- **Location**: `src/db/schema.ts` (L45-54)
- **Purpose**: 멤버별 블로그 글 제출 기록

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `serial` | PRIMARY KEY, AUTO INCREMENT | 제출 고유 ID |
| `cycle_id` | `integer` | NOT NULL, FK → cycles.id | 회차 ID |
| `member_id` | `integer` | NOT NULL, FK → members.id | 멤버 ID |
| `url` | `text` | NOT NULL | 블로그 글 URL |
| `submitted_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 제출일시 |
| `github_comment_id` | `text` | UNIQUE | GitHub 댓글 ID (중복 방지) |

### Foreign Keys

- `cycle_id` → `cycles(id)`
- `member_id` → `members(id)`

### Indexes

- `submissions_cycle_member_idx`: (`cycle_id`, `member_id`)

### TypeScript Types

```typescript
type Submission = {
  id: number;
  cycleId: number;
  memberId: number;
  url: string;
  submittedAt: Date;
  githubCommentId: string | null;
};

type NewSubmission = {
  id?: number;
  cycleId: number;
  memberId: number;
  url: string;
  submittedAt?: Date;
  githubCommentId?: string | null;
};
```

### Evidence

```typescript
// src/db/schema.ts:45-54
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  cycleId: integer('cycle_id').notNull().references(() => cycles.id),
  memberId: integer('member_id').notNull().references(() => members.id),
  url: text('url').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  githubCommentId: text('github_comment_id').unique(),
}, (table) => ({
  cycleMemberIdx: index('submissions_cycle_member_idx').on(table.cycleId, table.memberId),
}));
```

---

## Relationships

### ER Diagram

```
generations (1) ──────< (N) cycles
     │                       │
     │                       │
     └── (N) generation_members (M) ──┐
                                     │
                                     │
members (1) ──────< (N) submissions
```

### Key Relationships

1. **generations → cycles**: 1:N (한 기수는 여러 회차를 가짐)
2. **cycles → submissions**: 1:N (한 회차는 여러 제출을 가짐)
3. **members → submissions**: 1:N (한 멤버는 여러 제출을 가짐)
4. **generations ↔ members**: M:N (다대다, `generation_members` 조인 테이블)

### Query Patterns

**Get active cycles with submissions**:
```typescript
db.select()
  .from(cycles)
  .innerJoin(generations, eq(cycles.generationId, generations.id))
  .where(eq(generations.isActive, true))
```

**Get not submitted members for a cycle**:
```typescript
// 1. Get all members
const allMembers = await db.select().from(members);

// 2. Get submitted member IDs
const submittedIds = await db
  .select({ memberId: submissions.memberId })
  .from(submissions)
  .where(eq(submissions.cycleId, cycleId));

// 3. Filter
const notSubmitted = allMembers.filter(m => !submittedIds.includes(m.id));
```

---

## Type Exports

모든 테이블에서 Drizzle의 자동 추론 타입을 내보냅니다:

```typescript
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;
export type GenerationMember = typeof generationMembers.$inferSelect;
export type NewGenerationMember = typeof generationMembers.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
```
