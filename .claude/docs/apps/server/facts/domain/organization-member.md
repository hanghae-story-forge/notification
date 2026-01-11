# OrganizationMember Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/organization-member"
  source_files:
    apps/server/src/domain/organization-member/organization-member.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/organization-member/organization-member.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/organization-member/organization-member.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## OrganizationMember Entity

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L87-L238)
- **Type**: Entity (Aggregate Root 아님)
- **Purpose**: 조직과 회원의 관계(조직원)를 나타내는 엔티티

### Key Properties

- `id: OrganizationMemberId` - 조직원 ID (EntityId 상속)
- `_organizationId: OrganizationId` - 조직 ID (외부 참조)
- `_memberId: MemberId` - 회원 ID (외부 참조)
- `_role: OrganizationRoleVO` - 역할 (OWNER, ADMIN, MEMBER)
- `_status: OrganizationMemberStatusVO` - 상태 (PENDING, APPROVED, REJECTED, INACTIVE)
- `_joinedAt: Date` - 가입일시
- `_updatedAt: Date` - 수정일시

### Factory Methods

#### `create(data: CreateOrganizationMemberData): OrganizationMember`

- **Purpose**: 새 조직원 생성
- **Location**: L100-L120
- **Input**:
  - `id?: number` - ID (선택)
  - `organizationId: number` - 조직 ID (필수)
  - `memberId: number` - 회원 ID (필수)
  - `role: string` - 역할 (필수)
  - `status: string` - 상태 (필수)
  - `joinedAt?: Date` - 가입일시 (선택)
  - `updatedAt?: Date` - 수정일시 (선택)
- **Output**: OrganizationMember entity

### Business Logic

- `approve(): void` - 멤버 승인 (PENDING -> APPROVED) (L173-L179)
- `reject(): void` - 멤버 거절 (PENDING -> REJECTED) (L182-L188)
- `deactivate(): void` - 멤버 비활성화 (APPROVED -> INACTIVE) (L191-L197)
- `changeRole(newRole: string): void` - 역할 변경 (L200-L203)
- `isActiveMember(): boolean` - 활성 멤버인지 확인 (L206-L208)
- `hasAdminPrivileges(): boolean` - 관리자 권한 확인 (L211-L213)

### Enums

```typescript
enum OrganizationMemberStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INACTIVE = 'INACTIVE'
}

enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}
```

## OrganizationMember Value Objects

### OrganizationMemberStatusVO

- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Purpose**: 조직원 상태 Value Object
- **Validation**: PENDING, APPROVED, REJECTED, INACTIVE

### OrganizationRoleVO

- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Purpose**: 조직원 역할 Value Object
- **Validation**: OWNER, ADMIN, MEMBER

## OrganizationMember Repository Interface

- **Location**: `apps/server/src/domain/organization-member/organization-member.repository.ts`
- **Purpose**: 조직원 저장소 인터페이스

### Methods

- `save(organizationMember: OrganizationMember): Promise<void>` - 조직원 저장
- `findById(id: OrganizationMemberId): Promise<OrganizationMember | null>` - ID로 조회
- `findByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]>` - 조직별 조회
- `findByMember(memberId: MemberId): Promise<OrganizationMember[]>` - 회원별 조회
- `findByOrganizationAndMember(organizationId: OrganizationId, memberId: MemberId): Promise<OrganizationMember | null>` - 조직+회원으로 조회
- `findActiveByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]>` - 조직의 활성 멤버 조회
- `isActiveMember(organizationId: OrganizationId, memberId: MemberId): Promise<boolean>` - 활성 멤버인지 확인

## Domain Events

### OrganizationMemberJoinedEvent

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L24-L35)
- **Type**: `OrganizationMemberJoined` (const)

### OrganizationMemberApprovedEvent

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L37-L48)
- **Type**: `OrganizationMemberApproved` (const)

### OrganizationMemberRejectedEvent

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L50-L61)
- **Type**: `OrganizationMemberRejected` (const)

### OrganizationMemberDeactivatedEvent

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L63-L74)
- **Type**: `OrganizationMemberDeactivated` (const)
