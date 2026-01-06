# Generation Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/generation/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Generation Entity

- **Location**: `apps/server/src/domain/generation/generation.domain.ts`
- **Type**: Aggregate Root
- **Purpose**: 스터디 그룹의 기수(기간)를 나타내는 엔티티
- **Key Properties**:
  - `_organizationId: OrganizationId` - 조직 ID
  - `_name: string` - 기수명 (예: "똥글똥글 1기")
  - `_startedAt: Date` - 시작일
  - `_isActive: boolean` - 활성화 상태
  - `_createdAt: Date` - 생성 일시

## GenerationRepository Interface

- **Location**: `apps/server/src/domain/generation/generation.repository.ts`
- **Methods**:
  - `save(generation): Promise<void>` - 기수 저장
  - `findById(id): Promise<Generation | null>` - ID로 조회
  - `findActiveByOrganization(organizationId): Promise<Generation | null>` - 조직의 활성 기수
  - `findByOrganization(organizationId): Promise<Generation[]>` - 조직의 모든 기수
