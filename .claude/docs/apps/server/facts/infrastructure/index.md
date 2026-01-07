# Infrastructure Layer Facts

- **Scope**: apps/server/src/infrastructure
- **Layer**: Infrastructure Layer
- **Source of Truth**: Database, external services, persistence implementations
- **Last Verified**: 2026-01-07
- **Repo Ref**: 9164ce1

## Overview

The infrastructure layer provides technical implementations for domain and application interfaces:
- **Persistence**: Database access via Drizzle ORM
- **External Services**: Discord webhooks, GitHub integration
- **Configuration**: Environment variables, database connection

---

## Database Schema (Drizzle ORM)

### Schema Definition

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L1-180)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema Export**: Used for migrations and type inference

### Tables

#### organizations (L25-38)

Study groups/organizations table.

```typescript
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),      // URL-friendly identifier
  discordWebhookUrl: text('discord_webhook_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('organizations_slug_idx').on(table.slug),
}));
```

**Indexes**:
- `organizations_slug_idx` on `slug`

**Constraints**:
- `name` UNIQUE, NOT NULL
- `slug` UNIQUE, NOT NULL
- `isActive` DEFAULT true

---

#### members (L41-49)

Members table (Discord-based identity).

```typescript
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  discordId: text('discord_id').notNull().unique(),  // Discord User ID (unique)
  discordUsername: text('discord_username'),         // Discord username (mutable)
  discordAvatar: text('discord_avatar'),             // Discord avatar hash
  githubUsername: text('github_username'),           // GitHub username (optional)
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Constraints**:
- `discordId` UNIQUE, NOT NULL
- `githubUsername` no longer unique (can be shared across organizations)

**Note**: Previously `githubUsername` was unique. Now members can have same GitHub username across different organizations.

---

#### generations (L52-67)

Cohort/class periods table.

```typescript
export const generations = pgTable('generations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),                      // e.g., "똥글똥글 1기"
  startedAt: timestamp('started_at').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('generations_org_idx').on(table.organizationId),
}));
```

**Indexes**:
- `generations_org_idx` on `organizationId`

**Foreign Keys**:
- `organizationId` → `organizations.id`

---

#### cycles (L70-86)

Weekly submission periods table.

```typescript
export const cycles = pgTable('cycles', {
  id: serial('id').primaryKey(),
  generationId: integer('generation_id')
    .notNull()
    .references(() => generations.id),
  week: integer('week').notNull(),                   // 1, 2, 3...
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  githubIssueUrl: text('github_issue_url'),          // Archive repo issue URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  generationIdx: index('cycles_generation_idx').on(table.generationId),
}));
```

**Indexes**:
- `cycles_generation_idx` on `generationId`

**Foreign Keys**:
- `generationId` → `generations.id`

---

#### organization_members (L89-111)

Organization-members join table (replaces generation_members).

```typescript
export const organizationMembers = pgTable('organization_members', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  role: organizationRoleEnum('role').notNull(),      // OWNER | ADMIN | MEMBER
  status: organizationMemberStatusEnum('status').notNull(), // PENDING | APPROVED | REJECTED | INACTIVE
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgMemberIdx: index('org_members_org_member_idx').on(
    table.organizationId,
    table.memberId
  ),
  statusIdx: index('org_members_status_idx').on(table.status),
}));
```

**Enums**:
- `organization_role`: `'OWNER' | 'ADMIN' | 'MEMBER'`
- `organization_member_status`: `'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE'`

**Indexes**:
- `org_members_org_member_idx` composite on `(organizationId, memberId)`
- `org_members_status_idx` on `status`

**Foreign Keys**:
- `organizationId` → `organizations.id`
- `memberId` → `members.id`

---

#### generation_members (L114-132)

Generation-members join table (DEPRECATED).

```typescript
export const generationMembers = pgTable('generation_members', {
  id: serial('id').primaryKey(),
  generationId: integer('generation_id')
    .notNull()
    .references(() => generations.id),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  generationMemberIdx: index('gen_members_gen_member_idx').on(
    table.generationId,
    table.memberId
  ),
}));
```

**Status**: DEPRECATED - Replaced by `organization_members`

---

#### submissions (L135-155)

Blog post submissions table.

```typescript
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  cycleId: integer('cycle_id')
    .notNull()
    .references(() => cycles.id),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  url: text('url').notNull(),                        // Blog post URL
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  githubCommentId: text('github_comment_id').unique(), // GitHub comment ID (deduplication)
}, (table) => ({
  cycleMemberIdx: index('submissions_cycle_member_idx').on(
    table.cycleId,
    table.memberId
  ),
}));
```

**Indexes**:
- `submissions_cycle_member_idx` composite on `(cycleId, memberId)`

**Foreign Keys**:
- `cycleId` → `cycles.id`
- `memberId` → `members.id`

**Constraints**:
- `githubCommentId` UNIQUE (prevents duplicate submissions)

---

### Schema Relationships

```
organizations (1)
  ├── (N) generations
  │    └── (N) cycles
  │         └── (N) submissions
  └── (N) organization_members
       └── (1) members

members (1)
  ├── (N) organization_members
  │    └── (1) organizations
  └── (N) submissions
       └── (1) cycles
```

### Type Inference

Drizzle infers TypeScript types from schema:

```typescript
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
// ... etc for all tables
```

---

## Database Connection

### DB Instance

- **Location**: `apps/server/src/infrastructure/lib/db.ts` (L1-8)
- **Client**: postgres.js
- **ORM**: Drizzle ORM

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../persistence/drizzle-db/schema';
import { env } from '../../env';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

**Connection String**: From `DATABASE_URL` environment variable

**Default**: `postgresql://localhost:5432/dongueldonguel`

**Schema**: Passed to Drizzle for type-safe queries

---

## Repository Implementations

All repositories implement domain interfaces and use Drizzle ORM.

### DrizzleMemberRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/member.repository.impl.ts` (L9-103)
- **Implements**: `MemberRepository`

#### Methods

##### `save(member: Member): Promise<void>` (L10-35)

Insert or update member.

```typescript
if (dto.id === 0) {
  // Insert new member
  await db.insert(members).values({ /* ... */ });
} else {
  // Update existing member
  await db.update(members).set({ /* ... */ }).where(eq(members.id, dto.id));
}
```

##### `findById(id: MemberId): Promise<Member | null>` (L37-49)

Find member by ID.

##### `findByDiscordId(discordId: string): Promise<Member | null>` (L51-63)

Find member by Discord ID.

##### `findByGithubUsername(githubUsername: string): Promise<Member | null>` (L65-77)

Find member by GitHub username.

##### `findAll(): Promise<Member[]>` (L79-82)

Get all members.

##### `mapToEntity(row): Member` (L84-102)

Convert DB row to domain entity using `Member.reconstitute()`.

**Key Pattern**: Uses `Member.reconstitute()` to reconstruct domain entities (doesn't trigger domain events).

---

### DrizzleCycleRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/cycle.repository.impl.ts`
- **Implements**: `CycleRepository`

#### Key Methods

- `findById(id: CycleId)`
- `findByIssueUrl(url: string)` - Find by GitHub Issue URL
- `findByGenerationId(generationId: number)`
- `findCyclesWithDeadlineInRangeByOrganization(organizationId, start, end)`
- `findActiveCyclesByGeneration(generationId)`
- `findByGenerationAndWeek(generationId, week)`
- `save(cycle: Cycle)`

---

### DrizzleSubmissionRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/submission.repository.impl.ts` (L17-181)
- **Implements**: `SubmissionRepository`

#### Methods

##### `save(submission: Submission): Promise<void>` (L18-39)

Insert or update submission.

##### `findById(id: SubmissionId): Promise<Submission | null>` (L41-53)

Find by ID.

##### `findByCycleAndMember(cycleId, memberId): Promise<Submission | null>` (L55-75)

Find submission by cycle and member (composite query).

```typescript
await db.select()
  .from(submissions)
  .where(
    and(
      eq(submissions.cycleId, cycleId.value),
      eq(submissions.memberId, memberId.value)
    )
  )
  .limit(1);
```

##### `findByGithubCommentId(commentId: string): Promise<Submission | null>` (L77-89)

Find by GitHub comment ID (deduplication check).

##### `findByCycleId(cycleId: CycleId): Promise<Submission[]>` (L100-102)

Get all submissions for a cycle.

##### `findByMember(memberId: MemberId): Promise<Submission[]>` (L104-111)

Get all submissions by a member.

##### `findByOrganization(organizationId: number): Promise<Submission[]>` (L113-129)

Get submissions for an organization (JOIN with cycles and generations).

```typescript
await db.select({ /* ... */ })
  .from(submissions)
  .innerJoin(cycles, eq(submissions.cycleId, cycles.id))
  .innerJoin(generations, eq(cycles.generationId, generations.id))
  .where(eq(generations.organizationId, organizationId));
```

##### `delete(id: SubmissionId): Promise<void>` (L157-159)

Delete submission.

---

### DrizzleGenerationRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/generation.repository.impl.ts`
- **Implements**: `GenerationRepository`

#### Methods

- `findById(id: GenerationId)`
- `findByOrganizationId(organizationId: number)`
- `findActiveByOrganization(organizationId: number)`
- `save(generation: Generation)`

---

### DrizzleOrganizationRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/organization.repository.impl.ts`
- **Implements**: `OrganizationRepository`

#### Methods

- `findById(id: OrganizationId)`
- `findBySlug(slug: string)`
- `findAll()`
- `save(organization: Organization)`

---

### DrizzleOrganizationMemberRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/organization-member.repository.impl.ts`
- **Implements**: `OrganizationMemberRepository`

#### Key Methods

- `findById(id: OrganizationMemberId)`
- `findByOrganizationAndMember(organizationId, memberId)`
- `findActiveByOrganization(organizationId: OrganizationId)`
- `findPendingByOrganization(organizationId: OrganizationId)`
- `isActiveMember(organizationId, memberId): Promise<boolean>`
- `save(orgMember: OrganizationMember)`

---

### DrizzleGenerationMemberRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/generation-member.repository.impl.ts`
- **Implements**: `GenerationMemberRepository`
- **Status**: DEPRECATED

---

## External Services

### Discord Integration

#### DiscordWebhookClient

- **Location**: `apps/server/src/infrastructure/external/discord/discord.webhook.ts` (L16-63)
- **Implements**: `IDiscordWebhookClient`

##### Methods

###### `sendMessage(webhookUrl: string, message: DiscordMessage): Promise<void>` (L17-22)

Send raw Discord webhook message.

###### `sendSubmissionNotification(webhookUrl, memberName, cycleName, blogUrl): Promise<void>` (L24-32)

Send submission notification.

Creates message with:
- Content: "🎉 {memberName}님이 글을 제출했습니다!"
- Embed: Title, description (blog link), color (green), timestamp

###### `sendReminderNotification(webhookUrl, cycleName, endDate, notSubmittedNames): Promise<void>` (L34-46)

Send deadline reminder.

Creates message with:
- Content: "⏰ {cycleName} 마감까지 {time} 남았습니다!"
- Embed: Title, description (names), color (orange), deadline timestamp

###### `sendStatusNotification(webhookUrl, cycleName, submittedNames, notSubmittedNames, endDate): Promise<void>` (L48-62)

Send status report.

Creates message with:
- Embed: Title, fields (submitted, not submitted, deadline), color (blue), timestamp

#### Discord Message Builders

- **Location**: `apps/server/src/infrastructure/external/discord/discord.messages.ts` (L1-116)

##### `createSubmissionMessage(memberName, blogUrl, cycleName): DiscordMessage` (L8-24)

Returns formatted submission notification message.

```typescript
{
  content: `🎉 ${memberName}님이 글을 제출했습니다!`,
  embeds: [{
    title: `${cycleName} 제출 완료`,
    description: `[글 보러가기](${blogUrl})`,
    color: 0x00ff00, // Green
    timestamp: new Date().toISOString(),
  }],
}
```

##### `createReminderMessage(cycleName, deadline, notSubmitted): DiscordMessage` (L29-60)

Returns formatted reminder message.

Calculates time remaining:
- Formats as "X일 Y시간" or "Y시간"
- Uses Discord timestamp for deadline

```typescript
{
  content: `⏰ ${cycleName} 마감까지 ${timeText} 남았습니다!`,
  embeds: [{
    title: '미제출자 목록',
    description: notSubmitted.join(', '),
    color: 0xffaa00, // Orange
    fields: [{
      name: '마감 시간',
      value: `<t:${Math.floor(deadline.getTime() / 1000)}:F>`,
    }],
  }],
}
```

##### `createStatusMessage(cycleName, submitted, notSubmitted, deadline): DiscordMessage` (L65-97)

Returns formatted status message.

```typescript
{
  embeds: [{
    title: `${cycleName} 제출 현황`,
    color: 0x0099ff, // Blue
    fields: [
      { name: `✅ 제출 (${submitted.length})`, value: ..., inline: false },
      { name: `❌ 미제출 (${notSubmitted.length})`, value: ..., inline: false },
      { name: '⏰ 마감 시간', value: `<t:${timestamp}:R>`, inline: false },
    ],
  }],
}
```

##### `sendDiscordWebhook(webhookUrl, payload): Promise<void>` (L102-115)

Internal implementation using `fetch`.

```typescript
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  throw new Error(`Discord webhook failed: ${response.statusText}`);
}
```

#### Discord Interface

- **Location**: `apps/server/src/infrastructure/external/discord/discord.interface.ts`

```typescript
export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

export interface IDiscordWebhookClient {
  sendMessage(webhookUrl: string, message: DiscordMessage): Promise<void>;
  sendSubmissionNotification(...): Promise<void>;
  sendReminderNotification(...): Promise<void>;
  sendStatusNotification(...): Promise<void>;
}
```

---

### GitHub Integration

- **Location**: `apps/server/src/infrastructure/lib/github.ts`
- **Purpose**: GitHub API integration (future use)

---

### JWT Service Implementation

- **Location**: `apps/server/src/infrastructure/jwt/jwt.service.impl.ts`
- **Implements**: `JwtService` (domain interface)

#### Methods

- `generateToken(discordId: string, memberId: number): Promise<JwtToken>`
- `verifyToken(token: string): Promise<JwtPayload>`

**Library**: Uses JWT library (e.g., jsonwebtoken)

**Environment Variables**:
- `JWT_SECRET`: Secret key (min 32 characters)
- `JWT_EXPIRES_IN`: Token expiration (default: '7d')
- `JWT_ISSUER`: Issuer (default: 'dongueldonguel')
- `JWT_AUDIENCE`: Audience (default: 'dongueldonguel-api')

---

## Configuration

### Environment Variables

- **Location**: `apps/server/src/env.ts` (L4-110)
- **Library**: `@t3-oss/env-core` + Zod validation

#### Required Variables

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `DATABASE_URL` | string (URL) | PostgreSQL connection string | - |
| `DISCORD_BOT_TOKEN` | string (min 1) | Discord bot token | - |
| `DISCORD_CLIENT_ID` | string (min 1) | Discord application client ID | - |

#### Optional Variables

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `NODE_ENV` | enum | Environment | 'development' |
| `DISCORD_WEBHOOK_URL` | string (URL) | Discord webhook URL | - |
| `DISCORD_GUILD_ID` | string (min 1) | Discord server ID | - |
| `APP_ID` | string (min 1) | GitHub App ID | - |
| `APP_PRIVATE_KEY` | string (min 1) | GitHub App private key | - |
| `APP_INSTALLATION_ID` | string (min 1) | GitHub App installation ID | - |
| `DISCORD_OAUTH_CLIENT_ID` | string (min 1) | Discord OAuth client ID | - |
| `DISCORD_OAUTH_CLIENT_SECRET` | string (min 1) | Discord OAuth secret | - |
| `DISCORD_OAUTH_REDIRECT_URI` | string (URL) | Discord OAuth redirect URL | - |
| `JWT_SECRET` | string (min 32) | JWT secret key | - |
| `JWT_EXPIRES_IN` | string | JWT expiration time | '7d' |
| `JWT_ISSUER` | string | JWT issuer | 'dongueldonguel' |
| `JWT_AUDIENCE` | string | JWT audience | 'dongueldonguel-api' |

#### Validation

- **Strict Mode**: `runtimeEnvStrict` ensures all required vars are present
- **Skip Validation**: Set `SKIP_ENV_VALIDATION=1` for Docker builds
- **Error Handler**: Logs and throws on validation failure

#### Example Usage

```typescript
import { env } from './env';

// Access with autocomplete
const dbUrl = env.DATABASE_URL;
const webhookUrl = env.DISCORD_WEBHOOK_URL;

// Optional values are undefined if not set
if (env.JWT_SECRET) {
  // Use JWT
}
```

---

## Error Handling

### Infrastructure Errors

- **Database Errors**: Thrown by Drizzle/postgres.js
- **Network Errors**: Thrown by fetch (Discord webhooks)
- **Validation Errors**: Zod throws on env var validation

---

## Repository Pattern

### Mapping Strategy

All repositories follow same pattern:

```typescript
export class DrizzleXRepository implements XRepository {
  async save(entity: X): Promise<void> {
    const dto = entity.toDTO();

    if (dto.id === 0) {
      await db.insert(table).values(dto);
    } else {
      await db.update(table).set(dto).where(eq(table.id, dto.id));
    }
  }

  async findById(id: XId): Promise<X | null> {
    const result = await db.select().from(table).where(eq(table.id, id.value)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  private mapToEntity(row): X {
    return X.reconstitute({ /* ... */ });
  }
}
```

**Key Points**:
1. Use `entity.toDTO()` for persistence
2. Use `X.reconstitute()` for reconstruction (no events)
3. Return `null` if not found
4. Use Drizzle operators (`eq`, `and`, etc.)

---

## Migrations

### Migration Files

- **Location**: `apps/server/src/migrations/`
- **Files**:
  - `migrate.ts` - Standard migration runner
  - `migrate-safe.ts` - Safe migration with better error handling

### Commands

```bash
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio for DB inspection
```

---

## Evidence

```typescript
// Example: Repository with JOIN
async findByOrganization(organizationId: number): Promise<Submission[]> {
  const result = await db
    .select({
      id: submissions.id,
      cycleId: submissions.cycleId,
      memberId: submissions.memberId,
      url: submissions.url,
      submittedAt: submissions.submittedAt,
      githubCommentId: submissions.githubCommentId,
    })
    .from(submissions)
    .innerJoin(cycles, eq(submissions.cycleId, cycles.id))
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .where(eq(generations.organizationId, organizationId));

  return result.map((row) => this.mapToEntity(row));
}
```

```typescript
// Example: Discord webhook with fetch
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordMessage
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }
}
```

```typescript
// Example: Environment validation
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DISCORD_WEBHOOK_URL: z.string().url().optional(),
    DISCORD_BOT_TOKEN: z.string().min(1),
    // ...
  },
  runtimeEnvStrict: {
    DATABASE_URL: process.env.DATABASE_URL,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    // ...
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```
