# Cloudflare Workers 마이그레이션 준비

## 배경

현재 스터디봇은 Render Web Service 안에서 `discord.js` Gateway bot으로 실행된다.
Render Free 인스턴스가 sleep 상태가 되면 Discord Gateway 연결이 끊기고, `/cycle current` 같은 slash command가 봇까지 도달하지 않아 Discord에서 실패한다.

Cloudflare Workers로 옮길 때는 기존 `client.login()` Gateway 구조를 그대로 옮기지 않는다. Workers는 상시 프로세스가 아니라 요청 기반 실행 환경이므로, Discord Developer Portal의 **Interactions Endpoint URL** 방식으로 전환한다.

중요한 목표는 **Render API를 깨우는 프록시가 아니라 Render 의존성 제거**다. Worker가 `*.onrender.com` 또는 `API_BASE_URL`을 호출하는 방식은 명시적인 임시 브릿지 요청이 없는 한 사용하지 않는다.

## 목표 구조

```txt
Discord Slash Command
        ↓
Cloudflare Worker POST /discord/interactions
        ↓
Ed25519 signature verification
        ↓
Worker-native command handler
        ↓
Cloudflare D1 / Cloudflare-native bindings
        ↓
Discord interaction response
```

GitHub webhook과 reminder도 같은 원칙을 따른다.

```txt
GitHub Webhook ───────→ Cloudflare Worker POST /webhook/github ───────→ D1
Workers Cron Trigger ─→ Cloudflare Worker scheduled() ────────────────→ D1 + Discord API
```

초기 Worker URL 예시:

```txt
https://<worker-subdomain>.workers.dev/discord/interactions
```

## 현재 준비 범위

현재 스캐폴드는 실제 cutover 전 준비 단계다.

추가된 Worker 기능:

- `GET /health`
  - Worker 자체 헬스 체크
- `POST /discord/interactions`
  - Discord `x-signature-ed25519`, `x-signature-timestamp` 검증
  - Discord PING 요청에 `{ "type": 1 }` 응답
  - application command에 임시 ephemeral scaffold 응답
- `POST /webhook/github`
  - endpoint는 존재하지만 Render proxy는 비활성화한다
  - Cloudflare-native handler가 구현되기 전까지 `501`로 명시적으로 실패한다

아직 하지 않은 것:

- D1 schema/migration 확정
- 기존 PostgreSQL data export/import runbook 작성
- `/cycle current` 실제 비즈니스 로직을 D1 기반으로 이식
- GitHub webhook signature 검증 및 submission recording을 Worker-native로 이식
- reminder job을 Workers Cron Trigger로 이식
- Discord Developer Portal Interactions Endpoint 등록
- Render Gateway bot 비활성화

상세 구현 계획은 `docs/cloudflare-full-migration-plan.md`를 따른다.

## 필요한 Cloudflare secrets / bindings

실제 값은 커밋하지 않는다. 배포 전 Cloudflare에 secret으로 넣는다.

```bash
cd apps/worker
pnpm wrangler secret put DISCORD_PUBLIC_KEY
pnpm wrangler secret put DISCORD_APPLICATION_ID
pnpm wrangler secret put DISCORD_BOT_TOKEN
pnpm wrangler secret put GITHUB_WEBHOOK_SECRET
```

D1은 Cloudflare에서 database를 만든 뒤 Worker binding으로 연결한다.

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "donguel-donguel-notification",
      "database_id": "<set-after-cloudflare-d1-create>",
      "migrations_dir": "drizzle/d1"
    }
  ]
}
```

현재 scaffold PR에서는 실제 `database_id`를 커밋하지 않는다.

로컬 개발용 secret 예시는 `apps/worker/.dev.vars.example`을 복사해서 사용한다.

```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
```

## 로컬/CI 검증

repo root에서:

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"
pnpm install
pnpm --filter @hanghae-study/worker type-check
pnpm --filter @hanghae-study/worker test
pnpm worker:deploy:dry-run
```

기존 서버 회귀 검증이 필요한 PR에서는:

```bash
cd apps/server
SKIP_ENV_VALIDATION=true pnpm exec vitest run
```

## 배포 절차

Cloudflare 계정 인증은 로컬/CI 환경에서 한 번 필요하다.

```bash
cd apps/worker
pnpm wrangler login
pnpm wrangler whoami
```

secret 설정 후 repo root에서 dry-run과 실제 배포를 실행한다.

```bash
pnpm worker:deploy:dry-run
pnpm worker:deploy
```

배포 후 Worker URL은 보통 다음 형태다.

```txt
https://donguel-donguel-notification-worker.<account-subdomain>.workers.dev
```

Discord Developer Portal에는 아래 URL을 Interactions Endpoint URL로 등록한다.

```txt
https://donguel-donguel-notification-worker.<account-subdomain>.workers.dev/discord/interactions
```

## Cutover 순서

1. Cloudflare D1 database 생성
2. D1 schema/migrations 작성 및 remote apply
3. 기존 Postgres data export → D1 import
4. D1 row count/current-cycle/submission 검증
5. Cloudflare Worker secrets 설정
6. `pnpm worker:deploy:dry-run`으로 배포 번들 검증
7. `pnpm worker:deploy`로 Worker 배포
8. Discord Developer Portal에서 Interactions Endpoint URL을 Worker `/discord/interactions`로 등록
9. Discord PING 검증 통과 확인
10. `/cycle current`를 D1 기반 Worker HTTP interaction으로 smoke test
11. GitHub webhook URL을 Worker `/webhook/github`로 교체
12. Workers Cron Trigger reminder smoke test
13. 한 사이클 이상 안정화 확인 후 Render Gateway bot/service 중단

## 주의점

- Worker가 매번 Render API를 호출하면 Render sleep 지연이 다시 영향을 준다. 이 migration의 기본값은 no Render dependency다.
- Discord interaction은 짧은 시간 안에 응답해야 하므로, 오래 걸리는 작업은 deferred response/follow-up 설계가 필요하다. 단, deferred background work도 D1/Queue/Discord API 같은 Cloudflare-native 경로여야 한다.
- 기존 `discord.js`의 `deferReply()`, `editReply()` 중심 코드는 Worker에서 그대로 사용할 수 없다. Interaction response JSON 중심으로 재구성해야 한다.
- 기존 Postgres schema는 `pgEnum`, `jsonb`, `timestamp` 등 Postgres 전용 타입을 사용하므로 D1로 옮길 때 SQLite/D1 schema를 별도로 정의해야 한다.
