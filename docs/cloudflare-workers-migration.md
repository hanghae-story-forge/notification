# Cloudflare Workers migration setup

이 PR은 Render Free sleep으로 Discord slash command가 `응답 없음`이 되는 문제를 줄이기 위해 Cloudflare Workers 이전을 준비하는 환경구성이다.

## 목표

현재 Render Web Service가 담당하던 역할을 한 번에 모두 옮기지 않고, 응답 안정성에 가장 큰 영향을 주는 Discord Interaction Endpoint부터 분리한다.

```txt
Discord Slash Command
  -> Cloudflare Worker /discord/interactions
  -> command 처리 또는 기존 API 호출
  -> Discord interaction response
```

이 구조는 `discord.js` gateway bot이 Render에서 항상 로그인 상태를 유지해야 하는 의존을 제거한다.

## 이번 PR에 포함된 것

- `apps/worker` Cloudflare Workers 패키지 추가
- `wrangler.jsonc` 배포 설정 초안
- `/health` Worker 헬스체크
- `/discord/interactions` Discord Interaction Endpoint 스캐폴드
  - Discord Ed25519 signature 검증
  - Discord PING/PONG 응답
  - application command scaffold 응답
- `/webhook/github` 프록시 스캐폴드
  - 초기 이전 단계에서는 기존 Render API로 전달
- 로컬/운영 secret 예시 문서
- 최소 Vitest 테스트

## Cloudflare 설정값

### Wrangler vars

`apps/worker/wrangler.jsonc`에 커밋 가능한 기본값만 둔다.

```jsonc
{
  "vars": {
    "APP_ENV": "staging",
    "API_BASE_URL": "https://donguel-donguel-notification.onrender.com",
    "DISCORD_COMMAND_SYNC_POLICY": "interactions"
  }
}
```

### Secrets

실제 값은 커밋하지 말고 Cloudflare secret으로 넣는다.

```bash
cd apps/worker
pnpm wrangler secret put DISCORD_PUBLIC_KEY
pnpm wrangler secret put DISCORD_APPLICATION_ID
pnpm wrangler secret put DISCORD_BOT_TOKEN
pnpm wrangler secret put GITHUB_WEBHOOK_SECRET
```

초기 scaffold에서 필수인 값은 `DISCORD_PUBLIC_KEY`다. Discord Developer Portal의 Application Public Key를 사용한다.

## Discord Developer Portal 설정

1. Discord Developer Portal에서 bot application을 연다.
2. **General Information > Interactions Endpoint URL**에 Worker URL을 등록한다.

```txt
https://<worker-subdomain>.workers.dev/discord/interactions
```

3. 저장 시 Discord가 PING 요청을 보내며, Worker가 signature 검증 후 `{ "type": 1 }`로 응답해야 한다.
4. 이 방식이 검증되면 Render의 gateway bot 의존을 줄이거나 제거할 수 있다.

## 단계별 이전 계획

### Phase 1. Endpoint 검증

- Cloudflare Worker 배포
- Discord Interaction Endpoint URL 등록
- Discord PING 검증 통과 확인
- scaffold 응답으로 slash command 요청이 Worker에 도달하는지 확인

### Phase 2. 읽기 command 이전

우선 DB 쓰기가 없는 command부터 옮긴다.

- `/me info`
- `/cycle current`
- `/cycle status`

초기에는 Worker가 기존 Render API를 호출해 데이터를 읽어도 된다. 이 단계의 목표는 Discord 응답 경로를 Render sleep에서 분리하는 것이다.

### Phase 3. GitHub webhook 이전

- `/webhook/github` signature 검증 추가
- GitHub Issue comment payload 처리 이전
- 제출 저장/Discord 알림까지 Worker 경로에서 처리

### Phase 4. DB 전략 결정

둘 중 하나를 선택한다.

#### A. 기존 Postgres 유지

- Neon/Supabase HTTP driver 또는 Cloudflare Hyperdrive 검토
- 현재 Drizzle Postgres schema를 최대한 유지
- 마이그레이션 비용이 낮음

#### B. Cloudflare D1 이전

- D1 무료 한도 활용 가능
- Postgres -> SQLite 계열 schema 조정 필요
- Drizzle D1 adapter와 migration 재설계 필요

## 로컬 실행

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"
pnpm install
pnpm --filter @hanghae-study/worker test
pnpm --filter @hanghae-study/worker dev
```

로컬 secret은 `apps/worker/.dev.vars`에 둘 수 있고, 예시는 `.dev.vars.example`에 있다.

## 운영 주의사항

- Worker에는 `DISCORD_BOT_TOKEN`을 넣더라도 gateway login에는 사용하지 않는다.
- Interaction Endpoint 방식은 Discord 요청에 3초 안에 응답해야 한다.
- 무거운 처리는 defer/follow-up webhook 패턴으로 분리한다.
- Render API가 남아있는 동안 `API_BASE_URL` 장애는 Worker 응답에도 영향을 줄 수 있다.
- 완전한 sleep 제거는 command 처리와 필요한 read/write 경로가 Worker 쪽으로 이전되어야 달성된다.
