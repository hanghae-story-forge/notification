# Generation Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/generation"
  source_files:
    apps/server/src/domain/generation/generation.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/generation/generation.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Generation Entity

- **Location**: `apps/server/src/domain/generation/generation.domain.ts` (L49-L168)
- **Type**: Aggregate Root
- **Purpose**: 스터디 그룹의 기수(기간)를 나타내는 엔티티

### Key Properties

- `id: GenerationId` - 기수 ID (EntityId 상속)
- `_organizationId: number` - 조직 ID (외부 참조)
- `_name: string` - 기수명 (예: "똥글똥글 1기")
- `_startedAt: Date` - 시작일
- `_isActive: boolean` - 활성화 상태
- `_createdAt: Date` - 생성 일시

### Factory Methods

#### `create(data: CreateGenerationData): Generation`

- **Purpose**: 새 기수 생성
- **Location**: L63-L94
- **Input**:
  - `id?: number` - ID (선택)
  - `organizationId: number` - 조직 ID (필수)
  - `name: string` - 기수명 (필수, 1-50자)
  - `startedAt: Date` - 시작일 (필수)
  - `isActive?: boolean` - 활성화 상태 (선택, 기본 true)
  - `createdAt?: Date` - 생성일시 (선택)
- **Output**: Generation entity
- **Domain Events**: `GenerationActivatedEvent` (활성화된 새 기수 생성 시)

### Business Logic

- `isCurrentGeneration(): boolean` - 현재 활성화된 기수인지 확인 (L137-L139)
- `hasPassedDays(days: number): boolean` - 기수 시작 후 특정 일수가 지났는지 확인 (L142-L147)

### DTO

```typescript
interface GenerationDTO {
  id: number;
  organizationId: number;
  name: string;
  startedAt: string;
  isActive: boolean;
}
```

## Generation Repository Interface

- **Location**: `apps/server/src/domain/generation/generation.repository.ts`
- **Purpose**: 기수 저장소 인터페이스

### Methods

- `save(generation: Generation): Promise<void>` - 기수 저장
- `findById(id: GenerationId): Promise<Generation | null>` - ID로 조회
- `findActiveByOrganization(organizationId: number): Promise<Generation | null>` - 조직의 활성 기수 조회
- `findByOrganization(organizationId: number): Promise<Generation[]>` - 조직의 모든 기수 조회

## Domain Events

### GenerationActivatedEvent

- **Location**: `apps/server/src/domain/generation/generation.domain.ts` (L13-L24)
- **Type**: `GenerationActivated` (const)
- **Properties**:
  - `generationId: GenerationId`
  - `organizationId: number`
  - `name: string`
  - `occurredAt: Date`
- **Trigger**: 활성화된 새 기수 생성 시

### GenerationDeactivatedEvent

- **Location**: `apps/server/src/domain/generation/generation.domain.ts` (L26-L37)
- **Type**: `GenerationDeactivated` (const)
- **Properties**:
  - `generationId: GenerationId`
  - `organizationId: number`
  - `name: string`
  - `occurredAt: Date`

## Evidence

```typescript
// Generation entity creation (L63-L94)
static create(data: CreateGenerationData): Generation {
  const trimmedName = data.name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Generation name cannot be empty');
  }
  if (trimmedName.length > 50) {
    throw new Error('Generation name cannot exceed 50 characters');
  }

  const id = data.id ? GenerationId.create(data.id) : GenerationId.create(0);
  const generation = new Generation(id, data.organizationId, trimmedName, ...);

  if (data.id === 0 && data.isActive) {
    generation.addDomainEvent(new GenerationActivatedEvent(id, data.organizationId, trimmedName));
  }

  return generation;
}
```
