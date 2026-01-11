# GenerationMember Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/generation-member"
  source_files:
    apps/server/src/domain/generation-member/generation-member.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/generation-member/generation-member.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## GenerationMember Entity

- **Location**: `apps/server/src/domain/generation-member/generation-member.domain.ts` (L36-L118)
- **Type**: Aggregate Root
- **Purpose**: 기수와 회원의 관계(기수원)를 나타내는 엔티티

### Key Properties

- `id: GenerationMemberId` - 기수원 ID (EntityId 상속)
- `_generationId: GenerationId` - 기수 ID (외부 참조)
- `_memberId: MemberId` - 회원 ID (외부 참조)
- `_joinedAt: Date` - 가입일시

### Factory Methods

#### `create(data: CreateGenerationMemberData): GenerationMember`

- **Purpose**: 새 기수원 생성
- **Location**: L48-L71
- **Input**:
  - `id?: number` - ID (선택)
  - `generationId: number` - 기수 ID (필수)
  - `memberId: number` - 회원 ID (필수)
  - `joinedAt?: Date` - 가입일시 (선택)
- **Output**: GenerationMember entity
- **Domain Events**: `GenerationMemberJoinedEvent` (새 생성 시에만)

### DTO

```typescript
interface GenerationMemberDTO {
  id: number;
  generationId: number;
  memberId: number;
  joinedAt: string;
}
```

## GenerationMember Repository Interface

- **Location**: `apps/server/src/domain/generation-member/generation-member.repository.ts`
- **Purpose**: 기수원 저장소 인터페이스

### Methods

- `save(generationMember: GenerationMember): Promise<void>` - 기수원 저장
- `findById(id: GenerationMemberId): Promise<GenerationMember | null>` - ID로 조회
- `findByGeneration(generationId: GenerationId): Promise<GenerationMember[]>` - 기수별 조회
- `findByMember(memberId: MemberId): Promise<GenerationMember[]>` - 회원별 조회
- `findByGenerationAndMember(generationId: GenerationId, memberId: MemberId): Promise<GenerationMember | null>` - 기수+회원으로 조회

## Domain Events

### GenerationMemberJoinedEvent

- **Location**: `apps/server/src/domain/generation-member/generation-member.domain.ts` (L15-L26)
- **Type**: `GenerationMemberJoined` (const)
- **Properties**: `generationMemberId`, `generationId`, `memberId`, `occurredAt`
- **Trigger**: 새 기수원 생성 시 (`data.id === 0`)
