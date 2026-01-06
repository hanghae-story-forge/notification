# OrganizationMember Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/organization-member/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## OrganizationMember Entity

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L88-L238)
- **Type**: Entity (Aggregate Root 아님, 조직-회원 간 연결)
- **Purpose**: 조직과 회원의 다대다 관계를 나타내는 연결 엔티티
- **Key Properties**:
  - `_id: OrganizationMemberId` - 고유 ID
  - `_organizationId: OrganizationId` - 조직 ID (외부 참조)
  - `_memberId: MemberId` - 회원 ID (외부 참조)
  - `_role: OrganizationRoleVO` - 역할 (OWNER/ADMIN/MEMBER)
  - `_status: OrganizationMemberStatusVO` - 상태 (PENDING/APPROVED/REJECTED/INACTIVE)
  - `_joinedAt: Date` - 가입 일시
  - `_updatedAt: Date` - 상태 변경 일시
- **Domain Events**:
  - `OrganizationMemberJoinedEvent` - 조직 가입 요청 시
  - `OrganizationMemberApprovedEvent` - 가입 승인 시
  - `OrganizationMemberRejectedEvent` - 가입 거절 시
  - `OrganizationMemberDeactivatedEvent` - 멤버 비활성화 시
- **Business Logic**:
  - `approve()` - PENDING → APPROVED 상태 변경
  - `reject()` - PENDING → REJECTED 상태 변경
  - `deactivate()` - APPROVED → INACTIVE 상태 변경
  - `changeRole(newRole)` - 역할 변경
  - `isActiveMember()` - 활성 멤버(APPROVED)인지 확인
  - `hasAdminPrivileges()` - 관리자 권한(OWNER/ADMIN) 확인
- **Evidence**:
  ```typescript
  // L172-L179: 멤버 승인 로직
  approve(): void {
    if (!this._status.isPending()) {
      throw new Error('Only pending members can be approved');
    }
    this._status = OrganizationMemberStatusVO.approved();
    this._updatedAt = new Date();
  }
  ```

## OrganizationMemberId Value Object

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L16-L21)
- **Type**: EntityId (상속)
- **Purpose**: 조직원 관계의 고유 식별자
- **Evidence**:
  ```typescript
  export class OrganizationMemberId extends EntityId {
    static create(value: number): OrganizationMemberId {
      return new OrganizationMemberId(value);
    }
  }
  ```

## OrganizationMemberStatus Enum

- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Purpose**: 조직원 상태를 나타내는 열거형
- **Values**:
  - `PENDING` - 가입 대기 중 (승인 필요)
  - `APPROVED` - 승인된 활성 멤버
  - `REJECTED` - 가입 거절됨
  - `INACTIVE` - 비활성화됨
- **Evidence**:
  ```typescript
  export enum OrganizationMemberStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    INACTIVE = 'INACTIVE',
  }
  ```

## OrganizationRole Enum

- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Purpose**: 조직원 역할을 나타내는 열거형
- **Values**:
  - `OWNER` - 조직 소유자 (최고 권한)
  - `ADMIN` - 관리자 (멤버 관리 권한)
  - `MEMBER` - 일반 멤버
- **Evidence**:
  ```typescript
  export enum OrganizationRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
  }
  ```

## OrganizationMemberStatusVO Value Object

- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Type**: Value Object
- **Purpose**: 조직원 상태를 캡슐화하고 상태 전이 검증
- **Methods**:
  - `isPending()` - PENDING 상태인지 확인
  - `isApproved()` - APPROVED 상태인지 확인
  - `isRejected()` - REJECTED 상태인지 확인
  - `isInactive()` - INACTIVE 상태인지 확인
  - `static approved()` - APPROVED 상태 생성
  - `static rejected()` - REJECTED 상태 생성
  - `static inactive()` - INACTIVE 상태 생성

## OrganizationRoleVO Value Object

- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Type**: Value Object
- **Purpose**: 조직원 역할을 캡슐화하고 권한 검증
- **Methods**:
  - `isOwner()` - OWNER 역할인지 확인
  - `isAdmin()` - ADMIN 역할인지 확인
  - `isMember()` - MEMBER 역할인지 확인
  - `canManageMembers()` - 멤버 관리 권한 여부 (OWNER/ADMIN)

## OrganizationMemberRepository Interface

- **Location**: `apps/server/src/domain/organization-member/organization-member.repository.ts`
- **Purpose**: 조직원 리포지토리 인터페이스
- **Methods**:
  - `save(organizationMember): Promise<void>` - 조직원 저장
  - `findById(id): Promise<OrganizationMember | null>` - ID로 조회
  - `findByOrganizationAndMember(organizationId, memberId): Promise<OrganizationMember | null>` - 조직-멤버 조합으로 조회
  - `findActiveByOrganization(organizationId): Promise<OrganizationMember[]>` - 조직의 활성 멤버 목록
  - `isActiveMember(organizationId, memberId): Promise<boolean>` - 활성 멤버 여부 확인
