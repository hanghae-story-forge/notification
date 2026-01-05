# Generation Domain - 기수 도메인

---
metadata:
  domain: Generation
  aggregate_root: Generation
  bounded_context: Generation Management
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

기수 도메인은 똥글똥글의 기수(1기, 2기 등)를 관리합니다. 한 번에 하나의 기수만 활성화될 수 있으며, 기수는 여러 주차(Cycle)를 포함합니다.

## Aggregate Root: Generation

- **Location**: `src/domain/generation/generation.domain.ts` (L47-L147)
- **Purpose**: 기수 엔티티 (Aggregate Root)
- **Factory Methods**:
  - `Generation.create(data)` - 새 기수 생성
  - `Generation.reconstitute(data)` - DB에서 조회한 엔티티 복원

### 속성 (Properties)

| Property | Type | Description |
|----------|------|-------------|
| `id` | `GenerationId` | 기수 ID (EntityId 상속) |
| `_name` | `string` | 기수 이름 (예: "똥글똥글 1기") |
| `_startedAt` | `Date` | 기수 시작일 |
| `_isActive` | `boolean` | 활성화 상태 (한 번에 하나만 true) |
| `_createdAt` | `Date` | 생성 일시 |

### 비즈니스 로직 (Methods)

- **Location**: `src/domain/generation/generation.domain.ts` (L126-L136)
- `isCurrentGeneration(): boolean` - 활성화 상태 확인
- `hasPassedDays(days: number): boolean` - 기수가 시작된 지 특정 일수가 지났는지 확인
- `toDTO(): GenerationDTO` - DTO로 변환

## Domain Events

### GenerationActivatedEvent

- **Location**: `src/domain/generation/generation.domain.ts` (L13-L23)
- **Purpose**: 기수 활성화 시 발행
- **Payload**:
  - `generationId: GenerationId`
  - `name: string`

### GenerationDeactivatedEvent

- **Location**: `src/domain/generation/generation.domain.ts` (L25-L35)
- **Purpose**: 기수 비활성화 시 발행
- **Payload**:
  - `generationId: GenerationId`
  - `name: string`

## Repository Interface

### GenerationRepository

- **Location**: `src/domain/generation/generation.repository.ts` (L5-L10)
- **Purpose**: 기수 리포지토리 인터페이스 (Domain 계층 정의)

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `save(generation)` | `Promise<void>` | 기수 저장 |
| `findById(id)` | `Promise<Generation \| null>` | ID로 기수 조회 |
| `findActive()` | `Promise<Generation \| null>` | 활성화된 기수 조회 |
| `findAll()` | `Promise<Generation[]>` | 전체 기수 조회 |

## Domain Service

### GenerationService

- **Location**: `src/domain/generation/generation.service.ts` (L14-L104)
- **Purpose**: 기수 활성화/비활성화 관련 비즈니스 로직

### Methods

| Method | Description |
|--------|-------------|
| `findActiveGenerationOrThrow()` | 활성화된 기수 찾기 (없으면 에러) |
| `findGenerationByIdOrThrow(id)` | 기수 ID로 찾기 (없으면 에러) |
| `validateNewGeneration(isActive)` | 새 기수 생성 시 활성화된 기수가 있는지 확인 |
| `activateGeneration(id)` | 기수 활성화 (다른 기수 자동 비활성화) |
| `deactivateGeneration(id)` | 기수 비활성화 |

## 비즈니스 규칙 (Constraints)

1. **활성화 제한**: 한 번에 하나의 기수만 활성화될 수 있음
2. **이름 검증**:
   - 공백 불가
   - 50자 초과 불가
3. **기수 전환**: 새 기수를 활성화하면 이전 기수가 자동으로 비활성화됨

## 관계

- **Member**: N:M (via `generation_members` join table)
- **Cycle**: 1:N (한 기수는 여러 주차를 포함)

## 사용 예시

### 기수 생성

```typescript
// Domain Layer에서 직접 생성
const generation = Generation.create({
  name: '똥글똥글 1기',
  startedAt: new Date('2026-01-01'),
  isActive: true
});

// 또는 Command 통해 생성 (권장)
const result = await createGenerationCommand.execute({
  name: '똥글똥글 1기',
  startedAt: new Date('2026-01-01'),
  isActive: true
});
```

### 기수 활성화

```typescript
// Service 통해 활성화
await generationService.activateGeneration(generationId);

// 활성화된 기수 조회
const activeGen = await generationService.findActiveGenerationOrThrow();
console.log(`현재 기수: ${activeGen.name}`);
```

### 기수 경과일 확인

```typescript
if (generation.hasPassedDays(30)) {
  console.log('기수 시작 30일 경과');
}
```
