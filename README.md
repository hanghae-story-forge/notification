# 똥글똥글 API 서버

2주마다 글을 쓰는 모임의 자동화 시스템 API 서버

## 기술스택

- **Hono** - 웹 프레임워크
- **TypeScript**
- **Drizzle ORM** - DB ORM
- **Neon PostgreSQL** - 데이터베이스 (Serverless Postgres)

## 기능

1. **GitHub Issue 댓글 감지** - 글 제출 시 Discord 알림
2. **리마인더 API** - n8n에서 주기적으로 호출하여 미제출자 알림
3. **제출 현황 조회** - Discord 슬래시 명령어 `/check-submission` 지원

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env` 파일 생성:

```env
# Neon PostgreSQL (브랜치별로 다른 URL 사용)
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require

# Discord Webhook (제출/리마인더 알림)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Discord Bot (슬래시 명령어용)
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_server_id_here

# Server
PORT=3000
```

### 3. DB 마이그레이션

```bash
pnpm run db:push
```

### 4. 실행

```bash
pnpm run dev
```

## API 명세

### GitHub Webhook

#### `POST /webhook/github`

GitHub Issue 댓글 이벤트를 받아 제출을 기록하고 Discord 알림을 보냅니다.

**요청**: GitHub webhook payload

**동작**:
1. 댓글에서 URL 추출
2. 해당 Issue에 연결된 사이클 찾기
3. 제출 저장
4. Discord 알림 전송

### 리마인더 API (n8n용)

#### `GET /api/reminder?hoursBefore=24`

마감 일정이 임박한 사이클 목록을 반환합니다.

**응답**:
```json
{
  "cycles": [
    {
      "cycleId": 1,
      "cycleName": "똥글똥글 1기 - 1주차",
      "endDate": "2024-10-11T23:59:59.000Z",
      "githubIssueUrl": "https://github.com/hanghae-story-forge/archive/issues/1"
    }
  ]
}
```

#### `GET /api/reminder/:cycleId/not-submitted`

특정 사이클의 미제출자 목록을 반환합니다.

**응답**:
```json
{
  "cycleId": 1,
  "week": 1,
  "endDate": "2024-10-11T23:59:59.000Z",
  "notSubmitted": [
    { "github": "user1", "name": "홍길동", "discordId": "123456" }
  ],
  "submittedCount": 3,
  "totalMembers": 5
}
```

### 제출 현황 API (Discord용)

#### `GET /api/status/:cycleId`

특정 사이클의 제출 현황을 반환합니다.

**응답**:
```json
{
  "cycle": {
    "id": 1,
    "week": 1,
    "startDate": "2024-09-28T00:00:00.000Z",
    "endDate": "2024-10-11T23:59:59.000Z",
    "generationName": "똥글똥글 1기"
  },
  "summary": {
    "total": 5,
    "submitted": 3,
    "notSubmitted": 2
  },
  "submitted": [
    { "name": "홍길동", "github": "user1", "url": "https://...", "submittedAt": "..." }
  ],
  "notSubmitted": [
    { "name": "김철수", "github": "user2" }
  ]
}
```

#### `GET /api/status/:cycleId/discord`

Discord 메시지 포맷으로 제출 현황을 반환합니다.

**응답**: Discord webhook payload 형식

## DB 스키마

### `members`
- `id` (PK)
- `github` - GitHub username
- `discordId` - Discord ID
- `name` - 이름
- `createdAt`

### `generations`
- `id` (PK)
- `name` - 기수 이름 (예: "똥글똥글 1기")
- `startedAt` - 시작일
- `isActive` - 활성화 여부
- `createdAt`

### `cycles`
- `id` (PK)
- `generationId` (FK)
- `week` - 주차 (1, 2, 3...)
- `startDate` - 시작일시
- `endDate` - 마감일시
- `githubIssueUrl` - GitHub Issue URL
- `createdAt`

### `submissions`
- `id` (PK)
- `cycleId` (FK)
- `memberId` (FK)
- `url` - 블로그 글 URL
- `submittedAt` - 제출일시
- `githubCommentId` - GitHub 댓글 ID

## n8n 연동

### 리마인더 워크플로우

1. **Schedule Trigger** - 3일전, 2일전, 1일전, 6시간전, 1시간전 설정
2. **HTTP Request** - `GET /api/reminder?hoursBefore=X`
3. **Loop** - 각 사이클에 대해:
   - `GET /api/reminder/:cycleId/not-submitted`
   - Discord webhook으로 미제출자 알림

### 제출 현황 워크플로우

1. **Discord Trigger** - `/현황` 명령어
2. **HTTP Request** - `GET /api/status/:cycleId/discord`
3. **Discord** - webhook으로 응답 전송

## GitHub Webhook 설정

1. GitHub 레포 Settings > Webhooks > Add webhook
2. Payload URL: `https://your-server.com/webhook/github`
3. Content type: `application/json`
4. Events: Issue comments > `Comment created`
5. Secret 설정 (선택)

## Discord Bot 설정

`/check-submission` 슬래시 명령어를 사용하려면 Discord Bot이 필요합니다.

### 1. Discord 앱 생성

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. **New Application** 클릭 → 이름 입력
3. **Bot** 탭 → **Add Bot** 클릭
4. **Reset Token**으로 토큰 복사 → `DISCORD_BOT_TOKEN`

### 2. 봇을 서버에 초대

1. **OAuth2** → **URL Generator** 탭
2. Scopes: `bot`, `applications.commands` 체크
3. Bot Permissions: `Send Messages`, `Embed Links` 체크
4. 생성된 URL로 접속하여 봇을 서버에 초대

### 3. 서버 ID 확인

1. Discord 설정 → **고급** → **개발자 모드** 켜기
2. 서버 우클릭 → **ID 복사** → `DISCORD_GUILD_ID`

### 4. Application ID 확인

**General Information** 탭에서 **Application ID** 복사 → `DISCORD_CLIENT_ID`

## Neon DB 브랜치 간 데이터 마이그레이션

Neon DB의 develop 브랜치에서 production 브랜치로 데이터를 옮겨야 할 때 사용합니다.

### 마이그레이션 스크립트 실행

```bash
# 환경 변수 설정
export SOURCE_DB_URL="postgresql://user:password@ep-develop-xxx.aws.neon.tech/neondb?sslmode=require"
export TARGET_DB_URL="postgresql://user:password@ep-production-xxx.aws.neon.tech/neondb?sslmode=require"

# 스크립트 실행
pnpm tsx scripts/migrate-branch-to-production.ts
```

### 마이그레이션 과정

1. **데이터 내보내기** - 소스 브랜치에서 모든 테이블 데이터 추출
2. **타겟 비우기** - 타겟 브랜치의 기존 데이터 삭제 (참조 무결성 유지)
3. **데이터 가져오기** - 타겟 브랜치에 데이터 삽입
4. **검증** - 데이터 일치 여부 확인

### 주의사항

- 타겟 브랜치의 **모든 기존 데이터가 삭제됩니다**
- 외래 키 참조 무결성을 위해 테이블 순서를 자동으로 처리합니다
- 시퀀스(ID 자동 증가)가 올바르게 재설정됩니다

### 마이그레이션 대상 테이블

- `members` - 멤버 정보
- `generations` - 기수 정보
- `generation_members` - 기수-멤버 조인 테이블
- `cycles` - 주차 사이클
- `submissions` - 제출 기록
