# Organization Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/organization"
  source_files:
    apps/server/src/domain/organization/organization.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/organization/organization.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/organization/organization.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Organization Entity

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L59-L188)
- **Type**: Aggregate Root
- **Purpose**: 조직(스터디 그룹)을 나타내는 엔티티. 멀티 테넌트 시스템의 핵심 단위

### Key Properties

- `id: OrganizationId` - 조직 ID (EntityId 상속)
- `_name: OrganizationName` - 조직 이름
- `_slug: OrganizationSlug` - URL 식별자
- `_discordWebhookUrl: DiscordWebhookUrl` - Discord 웹훅 URL
- `_isActive: boolean` - 활성화 상태
- `_createdAt: Date` - 생성 일시

### Factory Methods

#### `create(data: CreateOrganizationData): Organization`

- **Purpose**: 새 조직 생성
- **Location**: L73-L102
- **Input**:
  - `id?: number` - ID (선택)
  - `name: string` - 조직 이름 (필수)
  - `slug?: string` - URL 식별자 (선택, 없으면 name에서 자동 생성)
  - `discordWebhookUrl?: string` - Discord 웹훅 URL (선택)
  - `isActive?: boolean` - 활성화 상태 (선택, 기본 true)
  - `createdAt?: Date` - 생성일시 (선택)
- **Output**: Organization entity
- **Domain Events**: `OrganizationCreatedEvent` (새 생성 시에만)

### Business Logic

- `activate(): void` - 조직 활성화 (L145-L151)
- `deactivate(): void` - 조직 비활성화 (L154-L160)
- `updateDiscordWebhookUrl(url: string | null): void` - Discord 웹훅 URL 업데이트 (L163-L165)

### DTO

```typescript
interface OrganizationDTO {
  id: number;
  name: string;
  slug: string;
  discordWebhookUrl: string | null;
  isActive: boolean;
  createdAt: string;
}
```

## Organization Value Objects

### OrganizationName

- **Location**: `apps/server/src/domain/organization/organization.vo.ts` (L5-L48)
- **Purpose**: 조직 이름 Value Object
- **Validation**: 1-100자, 빈 문자열 불가
- **Methods**: `create()`, `reconstitute()`, `equals()`

### OrganizationSlug

- **Location**: `apps/server/src/domain/organization/organization.vo.ts` (L50-L88)
- **Purpose**: URL 친화적인 조직 식별자 Value Object
- **Validation**: 2-50자, 소문자 알파벳/숫자/하이픈만 허용
- **Methods**: `create()`, `reconstitute()`, `equals()`

### DiscordWebhookUrl

- **Location**: `apps/server/src/domain/organization/organization.vo.ts` (L90-L127)
- **Purpose**: Discord 웹훅 URL Value Object
- **Validation**: `discord.com` 호스트네임, `/api/webhooks/` 경로
- **Methods**: `create()`, `createOrNull()`, `valueOrNull`

## Organization Repository Interface

- **Location**: `apps/server/src/domain/organization/organization.repository.ts`
- **Purpose**: 조직 저장소 인터페이스

### Methods

- `save(organization: Organization): Promise<void>` - 조직 저장
- `findById(id: OrganizationId): Promise<Organization | null>` - ID로 조회
- `findBySlug(slug: string): Promise<Organization | null>` - Slug으로 조회
- `findAll(): Promise<Organization[]>` - 전체 조회

## Domain Events

### OrganizationCreatedEvent

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L18-L29)
- **Type**: `OrganizationCreated` (const)
- **Properties**: `organizationId`, `name`, `slug`, `occurredAt`

### OrganizationActivatedEvent

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L31-L38)
- **Type**: `OrganizationActivated` (const)
- **Properties**: `organizationId`, `occurredAt`

### OrganizationDeactivatedEvent

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L40-L47)
- **Type**: `OrganizationDeactivated` (const)
- **Properties**: `organizationId`, `occurredAt`
