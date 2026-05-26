# Notification Full Cloudflare Migration Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Render Web Service 의존성을 제거하고 스터디봇/HTTP API/GitHub webhook/reminder 실행 경로를 Cloudflare Workers + Cloudflare-native storage/scheduling으로 이전한다.

**Architecture:** Discord Gateway bot(`client.login`)과 Render API를 중단하고, Discord Developer Portal Interactions Endpoint가 Cloudflare Worker의 `/discord/interactions`를 직접 호출하게 한다. Worker는 D1을 primary relational store로 사용하고, GitHub webhook과 scheduled reminder도 Worker entrypoint에서 직접 처리한다. 외부 호출은 Discord API/GitHub API처럼 실제 integration 대상에만 허용하고, `*.onrender.com` 또는 `API_BASE_URL` proxy는 금지한다.

**Tech Stack:** Cloudflare Workers, Hono, Discord HTTP Interactions, Cloudflare D1, Drizzle SQLite/D1 schema, Workers Cron Triggers, Vitest, Wrangler.

---

## Non-goals / Guardrails

- Render API proxy 금지: `API_BASE_URL`, `*.onrender.com`, `/webhook/github` forwarding을 새 코드에 추가하지 않는다.
- Cloudflare Workers에서 `discord.js` Gateway bot을 실행하지 않는다.
- 실제 Discord/GitHub/Cloudflare secret 값을 커밋하지 않는다.
- 기존 `apps/server` 파일은 read-only reference로 먼저 다룬다. 재사용이 필요하면 Worker-compatible package로 분리하는 PR을 별도로 만든다.
- 기존 main worktree가 dirty하면 `/tmp/notification-full-cf-*` 같은 별도 worktree에서 작업한다.

## Current Render-dependent inventory

| Area | Current file(s) | Render dependency | Cloudflare target |
| --- | --- | --- | --- |
| Discord slash commands | `apps/server/src/index.ts`, `apps/server/src/presentation/discord/**` | Render process keeps Discord Gateway connection alive | Worker `/discord/interactions` HTTP endpoint |
| Status/current cycle API | `apps/server/src/presentation/http/status/status.handlers.ts`, `apps/server/src/application/queries/get-cycle-status.query.ts` | Discord command calls server-side query via Render-hosted app | Worker handler queries D1 directly |
| GitHub webhook | `apps/server/src/presentation/http/github/github.handlers.ts` | GitHub posts to Render `/webhook/github` | GitHub posts to Worker `/webhook/github`, Worker verifies signature and writes D1 |
| Reminder API/jobs | `apps/server/src/presentation/http/reminder/reminder.handlers.ts` | External scheduler/HTTP path depends on Render being reachable | Worker `scheduled()` Cron Trigger queries D1 and sends Discord webhook/API messages |
| DB access | `apps/server/src/infrastructure/lib/db.ts`, `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` | Node postgres driver from Render runtime | D1 binding + Drizzle SQLite/D1 schema |
| GraphQL/admin API | `apps/server/src/presentation/graphql/**` | Render HTTP service | Later Worker route or separate Cloudflare app; not required for first Discord command cutover |

## Target Worker bindings

Initial binding shape:

```ts
interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_BOT_TOKEN: string;
  GITHUB_WEBHOOK_SECRET: string;
  DB: D1Database;
}
```

Wrangler target shape:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "donguel-donguel-notification",
      "database_id": "<set-after-cloudflare-d1-create>",
      "migrations_dir": "drizzle/d1"
    }
  ],
  "triggers": {
    "crons": ["0 9 * * *", "0 21 * * *"]
  }
}
```

`database_id`는 Cloudflare에서 D1 생성 후 별도 PR/환경 설정으로 채운다. placeholder만 커밋한다.

---

## Phase 0: Remove proxy defaults from the Worker scaffold

### Task 0.1: Remove `API_BASE_URL` binding

**Objective:** Worker scaffold가 Render URL을 기본 설정으로 들고 있지 않게 한다.

**Files:**
- Modify: `apps/worker/wrangler.jsonc`
- Modify: `apps/worker/worker-configuration.d.ts`
- Modify: `apps/worker/.dev.vars.example`
- Test: `apps/worker/test/discord.test.ts`

**Steps:**
1. Delete `vars.API_BASE_URL` from `wrangler.jsonc`.
2. Delete `API_BASE_URL` from `Env` type.
3. Delete `API_BASE_URL=...onrender.com` from `.dev.vars.example`.
4. Update the test env fixture to remove `API_BASE_URL`.
5. Run:

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"
pnpm --filter @hanghae-study/worker type-check
pnpm --filter @hanghae-study/worker test
```

Expected: both pass.

### Task 0.2: Replace GitHub webhook proxy with explicit native-placeholder behavior

**Objective:** `/webhook/github` exists, but cannot silently forward to Render.

**Files:**
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/test/discord.test.ts`

**Step 1: Write/update test**

Add a test that posts to `/webhook/github` and asserts:

```ts
expect(response.status).toBe(501);
await expect(response.json()).resolves.toMatchObject({
  error: 'github_webhook_native_handler_not_implemented',
});
expect(fetchSpy).not.toHaveBeenCalled();
```

**Step 2: Implement minimal handler**

```ts
app.post('/webhook/github', (context) => {
  return context.json(
    {
      error: 'github_webhook_native_handler_not_implemented',
      message:
        'GitHub webhook must be handled natively in Cloudflare Worker; Render proxy is disabled.',
    },
    501,
  );
});
```

**Step 3: Verify**

```bash
pnpm --filter @hanghae-study/worker test
```

Expected: webhook test passes and no network fetch is made.

---

## Phase 1: D1 schema foundation

### Task 1.1: Create D1 schema location

**Objective:** Start a D1-specific schema without breaking the existing Postgres server schema.

**Files:**
- Create: `apps/worker/src/db/schema.ts`
- Create: `apps/worker/src/db/types.ts`
- Modify: `apps/worker/package.json`

**Implementation notes:**
- Add Drizzle D1 dependencies in a dedicated PR:

```bash
pnpm --filter @hanghae-study/worker add drizzle-orm
pnpm --filter @hanghae-study/worker add -D drizzle-kit
```

- Use SQLite/D1 primitives, not `pgTable`/`pgEnum`.
- Preserve table names from the production schema where possible:
  - `organizations`
  - `studies`
  - `members`
  - `member_identities`
  - `generations`
  - `cycles`
  - `organization_members`
  - `generation_participants`
  - `generation_participant_roles`
  - `submissions`
  - peer-review/outbox tables as later tasks

### Task 1.2: Add initial D1 migrations

**Objective:** Make D1 database reproducible from source.

**Files:**
- Create: `apps/worker/drizzle.config.ts`
- Create: `apps/worker/drizzle/d1/*.sql`
- Modify: `apps/worker/package.json`

**Scripts:**

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate:local": "wrangler d1 migrations apply donguel-donguel-notification --local",
  "db:migrate:remote": "wrangler d1 migrations apply donguel-donguel-notification --remote"
}
```

**Verification:**

```bash
pnpm --filter @hanghae-study/worker db:generate
pnpm --filter @hanghae-study/worker db:migrate:local
```

Expected: local D1 migration applies without relying on Render/Postgres.

### Task 1.3: Add data export/import runbook

**Objective:** Define how existing production data leaves Postgres and enters D1 without embedding credentials.

**Files:**
- Create: `docs/cloudflare-d1-data-migration-runbook.md`

**Required sections:**
- Read-only Postgres export command using local secure env only.
- CSV/JSON normalization rules for timestamps/enums/jsonb.
- D1 import command.
- Validation SQL counts for organizations/generations/cycles/submissions.
- Rollback plan: keep Render read-only until D1 validation passes.

---

## Phase 2: `/cycle current` Worker-native command

### Task 2.1: Add Worker repository for current cycle query

**Objective:** Worker can answer current-cycle status from D1 directly.

**Files:**
- Create: `apps/worker/src/features/cycle/current-cycle.repository.ts`
- Create: `apps/worker/src/features/cycle/current-cycle.repository.test.ts`

**Repository contract:**

```ts
export interface CurrentCycleStatus {
  id: number;
  week: number;
  generationName: string;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  submittedNames: string[];
  notSubmittedNames: string[];
}

export interface CurrentCycleRepository {
  getCurrentCycleStatus(organizationSlug: string): Promise<CurrentCycleStatus | null>;
}
```

**Query rule:**
- Organization matched by `organizations.slug`.
- Current cycle is `cycles.status IN ('OPEN', 'ACTIVE')` or date range containing now, ordered by `end_date ASC`.
- Participant set comes from approved `generation_participants`, not legacy global members.
- Exclude inactive/removed/non-participant roles from required-submission calculations.

### Task 2.2: Add Discord response formatter

**Objective:** Preserve explicit next-action guidance in Discord output.

**Files:**
- Create: `apps/worker/src/features/cycle/current-cycle.discord.ts`
- Create: `apps/worker/src/features/cycle/current-cycle.discord.test.ts`

**Formatter behavior:**
- No current cycle: tell user no active cycle exists and include admin next action.
- Current cycle with issue URL: include link button to GitHub issue.
- Submitted/missing lists should be concrete names.
- Missing prerequisites should tell the user what to do next.

### Task 2.3: Wire `/cycle current` to Worker interactions

**Objective:** Discord slash command returns D1-backed result without Render.

**Files:**
- Modify: `apps/worker/src/discord.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/test/discord.test.ts`

**Test assertions:**
- `/cycle current` returns Discord response type `4` with D1-backed content.
- No request is made to `*.onrender.com`.
- Missing active cycle returns helpful guidance.
- Invalid signature still returns `401`.

---

## Phase 3: GitHub webhook Worker-native handling

### Task 3.1: Implement GitHub signature verification

**Files:**
- Create: `apps/worker/src/github/signature.ts`
- Create: `apps/worker/src/github/signature.test.ts`

**Rules:**
- Verify `x-hub-signature-256` using `GITHUB_WEBHOOK_SECRET` and raw body.
- Reject missing/invalid signatures with `401`.
- Do not log secret or raw signature.

### Task 3.2: Implement issue_comment submission recording

**Files:**
- Create: `apps/worker/src/features/submissions/record-submission.ts`
- Create: `apps/worker/src/features/submissions/record-submission.test.ts`
- Modify: `apps/worker/src/index.ts`

**Rules:**
- Accept GitHub `issue_comment.created` only.
- Extract first `http(s)` URL from comment body.
- Match cycle by `github_issue_url` or GitHub issue metadata.
- Map GitHub username through D1 identities/members.
- Upsert/dedupe by `source_github_comment_id`.
- Send Discord notification from Worker if configured.

### Task 3.3: Implement issues webhook cycle drift/create handling

**Files:**
- Create: `apps/worker/src/features/cycle/github-issue-events.ts`
- Create: `apps/worker/src/features/cycle/github-issue-events.test.ts`

**Rules:**
- `issues.opened` can create cycle only when organization/generation mapping is explicit.
- `issues.closed` records close/drift signal in D1 outbox or cycle fields.
- Unknown/unmapped issues return 200 with ignored reason to avoid GitHub retry storms.

---

## Phase 4: Reminder scheduling on Cloudflare

### Task 4.1: Add scheduled handler

**Files:**
- Modify: `apps/worker/src/index.ts`
- Create: `apps/worker/src/scheduled/reminders.ts`
- Create: `apps/worker/src/scheduled/reminders.test.ts`
- Modify: `apps/worker/wrangler.jsonc`

**Rules:**
- Export Worker object with both `fetch` and `scheduled` handlers if Hono default export needs wrapping.
- Cron queries D1 for cycles nearing deadline.
- Send Discord messages from Worker.
- Record notification attempts in D1 outbox/log table to avoid duplicate spam.

---

## Phase 5: Cutover checklist

1. Create Cloudflare D1 database.
2. Fill `database_id` in `apps/worker/wrangler.jsonc` or environment-specific config.
3. Apply D1 migrations locally and remotely.
4. Export current Postgres data using secure local env; import to D1.
5. Validate row counts and spot-check current cycle/submission status.
6. Deploy Worker.
7. Register Discord Interactions Endpoint URL:

```txt
https://<worker-domain>/discord/interactions
```

8. Update GitHub webhook URL to Worker `/webhook/github`.
9. Run Discord smoke tests:
   - `/cycle current`
   - submission comment → D1 row + Discord notification
   - reminder scheduled dry-run/manual endpoint if present
10. Disable Render Gateway bot start.
11. Turn Render service read-only/stop after one full cycle passes.

---

## Verification commands before each PR

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"
pnpm install
pnpm --filter @hanghae-study/worker format
pnpm --filter @hanghae-study/worker type-check
pnpm --filter @hanghae-study/worker test
pnpm --filter @hanghae-study/worker exec wrangler deploy --dry-run
pnpm --filter @hanghae-study/worker format:check
git diff --check -- apps/worker docs pnpm-lock.yaml
```

For PRs that touch existing server/shared code:

```bash
SKIP_ENV_VALIDATION=true pnpm type-check
SKIP_ENV_VALIDATION=true pnpm test
pnpm lint
pnpm build
```

## PR sequence

1. `docs/chore`: full CF migration plan + remove proxy defaults from scaffold. ✅ merged
2. `feat(worker-d1-cycle-current)`: D1 schema, migrations, D1 binding, and `/cycle current` D1-backed interaction.
3. `feat(worker-github-webhook)`: native GitHub webhook verification + submission recording.
4. `feat(worker-reminders)`: Cron Trigger reminder handling.
5. `chore(cutover)`: Discord/GitHub endpoint switch docs and Render shutdown checklist.
