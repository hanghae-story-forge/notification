# Workspace Documentation

- **Type**: Turborepo Monorepo
- **Package Manager**: pnpm
- **Last Updated**: 2025-01-05

## Overview

똥글똥글 (Donguel-Donguel) 프로젝트는 격주 글쓰기 모임을 위한 자동화 시스템을 제공하는 Turborepo 기반 모노레포입니다.

## Workspace Structure

```
baku/
├── apps/
│   ├── server/          # 메인 API 서버 (@hanghae-study/server)
│   └── client/          # 클라이언트 앱 (@hanghae-study/client) - 개발 예정
├── packages/            # 공유 패키지 - 향후 추가 예정
├── .claude/             # Claude Code 설정 및 문서
└── test-webhook/        # GitHub 웹훅 테스트 페이로드
```

## Applications

### server (@hanghae-study/server)

격주 글쓰기 모임을 위한 자동화 API 서버입니다.

- **Framework**: Hono (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Architecture**: Domain-Driven Design (DDD)
- **Documentation**: [apps/server/](../apps/server/)

### client (@hanghae-study/client)

클라이언트 애플리케이션 (개발 예정)

## Development

```bash
# 전체 워크스페이스 개발 서버 시작
pnpm dev

# 전체 빌드
pnpm build

# 데이터베이스 마이그레이션
pnpm db:migrate
```

## Documentation Navigation

- **Workspace Architecture**: [architecture.md](./architecture.md)
- **Server App**: [apps/server/](../apps/server/)
