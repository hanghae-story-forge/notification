# Cloudflare Workers 마이그레이션 준비

## 배경

현재 스터디봇은 Render Web Service 안에서 `discord.js` Gateway bot으로 실행된다.
Render Free 인스턴스가 sleep 상태가 되면 Discord Gateway 연결이 끊기고, `/cycle current` 같은 slash command가 봇까지 도달하지 않아 Discord에서 실패한다.

Cloudflare Workers로 옮길 때는 기존 `client.login()` Gateway 구조를 그대로 옮기지 않는다. Workers는 상시 프로세스가 아니라 요청 기반 실행 환경이므로, Discord Developer Portal의 **Interactions Endpoint URL** 방식으로 전환한다.

## 목표 구조

```txt
Discord Slash Command
        ↓
Cloudflare Worker POST /discord/interactions
        ↓
Ed25519 signature verification
        ↓
HTTP interaction handler
        ↓
Discord interaction response
```

초기 Worker URL 예시:

```txt
https://<worker-subdomain>.workers.dev/discord/interactions
```

## 이번 준비 범위

이번 스캐폴드는 실제 cutover 전 준비 단계다.

추가된 Worker 기능:

- `GET /health`
  - Worker 자체 헬스 체크
- `POST /discord/interactions`
  - Discord `x-signature-ed25519`, `x-signature-timestamp` 검증
  - Discord PING 요청에 `{ "type": 1 }` 응답
  - application command에 임시 ephemeral scaffold 응답
- `POST /webhook/github`
  - 단계적 이전을 위한 기존 Render API 프록시

아직 하지 않은 것:

- `/cycle current` 실제 비즈니스 로직 이식
- DB 직접 연결 전략 확정
- Discord Developer Portal Interactions Endpoint 등록
- Render Gateway bot 비활성화

## 필요한 Cloudflare secrets

실제 값은 커밋하지 않는다. 배포 전 Cloudflare에 secret으로 넣는다.

```bash
cd apps/worker
pnpm wrangler secret put DISCORD_PUBLIC_KEY
pnpm wrangler secret put DISCORD_APPLICATION_ID
pnpm wrangler secret put DISCORD_BOT_TOKEN
pnpm wrangler secret put GITHUB_WEBHOOK_SECRET
```

일반 변수:

```txt
API_BASE_URL=https://donguel-donguel-notification.onrender.com
```

## 로컬/CI 검증

repo root에서:

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"
pnpm install
pnpm --filter @hanghae-study/worker type-check
pnpm --filter @hanghae-study/worker test
pnpm --filter @hanghae-study/worker exec wrangler deploy --dry-run
```

기존 서버 회귀 검증:

```bash
cd apps/server
SKIP_ENV_VALIDATION=true pnpm exec vitest run
```

## Cutover 순서

1. Cloudflare Worker secrets 설정
2. Worker 배포
3. Discord Developer Portal에서 Interactions Endpoint URL을 Worker `/discord/interactions`로 등록
4. Discord PING 검증 통과 확인
5. `/cycle current`부터 Worker HTTP interaction 방식으로 이식
6. DB 접근 전략 결정
   - 단기: Worker가 기존 Render API 호출
   - 중기: Worker-compatible Postgres 접근
   - 장기: 필요하면 D1 등 Cloudflare-native 저장소 검토
7. Worker command handler가 안정화된 뒤 Render의 Gateway bot 시작을 끄거나 제거

## 주의점

- Worker로 바꿔도 Worker가 매번 Render API를 호출하면 Render sleep 지연이 다시 영향을 줄 수 있다.
- Discord interaction은 짧은 시간 안에 응답해야 하므로, 오래 걸리는 작업은 deferred response/follow-up 설계가 필요하다.
- 기존 `discord.js`의 `deferReply()`, `editReply()` 중심 코드는 Worker에서 그대로 사용할 수 없다. Interaction response JSON 중심으로 재구성해야 한다.
