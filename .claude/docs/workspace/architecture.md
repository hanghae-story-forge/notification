# Workspace Architecture

- **Type**: Turborepo Monorepo
- **Last Updated**: 2025-01-05

## Monorepo Strategy

### Build System

- **Tool**: Turborepo
- **Package Manager**: pnpm (v10+)
- **Caching**: Turborepo remote caching for faster builds

### Workspace Configuration

**Root `package.json`**:
- Workspaces: `["apps/*"]`
- Scripts: `turbo run dev`, `turbo run build`, etc.

**`turbo.json`**:
- Task pipeline for dev, build, lint, db operations
- Output caching configuration

## Application Architecture

### server (@dongueldonguel/server)

[server 앱 아키텍처 문서](../apps/server/facts/) 참조

**핵심 구조**:
```
apps/server/src/
├── domain/              # 도메인 계층 (DDD)
│   ├── cycle/
│   ├── generation/
│   ├── member/
│   └── submission/
├── application/         # 애플리케이션 계층 (CQRS)
│   ├── commands/
│   ├── queries/
│   └── event-handlers/
├── presentation/        # 프레젠테이션 계층
│   ├── http/           # Hono HTTP routes
│   ├── graphql/        # Pylon GraphQL
│   └── discord/        # Discord webhook
└── infrastructure/      # 인프라 계층
    ├── persistence/    # Drizzle ORM
    └── external/       # 외부 서비스
```

### client (@dongueldonguel/client)

개발 예정

## Cross-Application Communication

현재 단독 server 앱만 운영 중으로, 앱 간 통신은 없습니다.

향후 client 앱 추가 시:
- **API Gateway**: server 앱의 HTTP/GraphQL API
- **WebSocket**: 실시간 알림 (고려 중)

## Shared Packages (향후)

예상되는 공유 패키지:

```
packages/
├── shared-types/        # TypeScript 타입 정의 공유
├── domain-core/         # 도메인 모델 공유
└── ui-components/       # 공유 UI 컴포넌트 (client용)
```

## Deployment Strategy

- **Development**: 각 앱 독립 실행 (`pnpm dev`)
- **Production**: 단일 Docker 컨테이너 (server) 또는 분리 배포 (향후)

## Data Architecture

- **Database**: 단일 PostgreSQL 인스턴스 (공유)
- **Schema**: [apps/server/facts/database/schema.md](../apps/server/facts/database/schema.md)
