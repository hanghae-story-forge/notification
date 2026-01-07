# 똥글똥글 (Donguel-Donguel)

2주마다 글을 쓰는 모임의 자동화 플랫폼

## 개요

똥글똥글은 글쓰기 모임을 운영하기 위한 전체 자동화 시스템입니다. 멤버들이 GitHub Issue에 댓글로 글을 제출하면 자동으로 기록되고, Discord로 알림이 발송됩니다.

## 프로젝트 구조

```
zagreb/
├── apps/
│   ├── server/          # API 서버 (Hono + TypeScript)
│   └── client/          # 클라이언트 앱
├── packages/            # 공유 패키지
└── .claude/docs/        # 코드베이스 문서
```

### 앱 안내

- **[Server](./apps/server/README.md)** - API 서버, GitHub Webhook, Discord Bot
- **[Client](./apps/client/README.md)** - 웹 인터페이스

## 빠른 시작

### 사전 요구사항

- Node.js >= 18.0.0
- pnpm 10.0.0

### 설치

```bash
pnpm install
```

### 개발

```bash
# 모든 앱 개발 모드 시작
pnpm dev

# 특정 앱만 시작
pnpm --filter server dev
pnpm --filter client dev
```

### 빌드

```bash
pnpm build
```

## 기술 스택

- **Build System**: Turborepo + pnpm workspaces
- **Server**: Hono, TypeScript, Drizzle ORM, PostgreSQL
- **Database**: Neon PostgreSQL (Serverless)

## 문서

- **[코드베이스 문서](./.claude/docs/apps/server/README.md)** - 아키텍처, 도메인, API 상세 문서
- **[기여 가이드](./CONTRIBUTING.md)** - 개발 환경 설정 및 기여 방법

## 라이선스

MIT
