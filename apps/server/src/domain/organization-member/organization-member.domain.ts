// OrganizationMember Domain - 조직원 도메인

import { EntityId } from '../common/types';
import { OrganizationId } from '../organization/organization.domain';
import { MemberId } from '../member/member.domain';
import {
  OrganizationMemberStatusVO,
  OrganizationMemberStatus,
  OrganizationRoleVO,
  OrganizationRole,
} from './organization-member.vo';

// Re-export enums for convenience
export { OrganizationMemberStatus, OrganizationRole };

// OrganizationMember ID
export class OrganizationMemberId extends EntityId {
  static create(value: number): OrganizationMemberId {
    return new OrganizationMemberId(value);
  }
}

// 도메인 이벤트
export class OrganizationMemberJoinedEvent {
  readonly type = 'OrganizationMemberJoined' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly organizationMemberId: OrganizationMemberId,
    public readonly organizationId: OrganizationId,
    public readonly memberId: MemberId
  ) {
    this.occurredAt = new Date();
  }
}

export class OrganizationMemberApprovedEvent {
  readonly type = 'OrganizationMemberApproved' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly organizationMemberId: OrganizationMemberId,
    public readonly organizationId: OrganizationId,
    public readonly memberId: MemberId
  ) {
    this.occurredAt = new Date();
  }
}

export class OrganizationMemberRejectedEvent {
  readonly type = 'OrganizationMemberRejected' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly organizationMemberId: OrganizationMemberId,
    public readonly organizationId: OrganizationId,
    public readonly memberId: MemberId
  ) {
    this.occurredAt = new Date();
  }
}

export class OrganizationMemberDeactivatedEvent {
  readonly type = 'OrganizationMemberDeactivated' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly organizationMemberId: OrganizationMemberId,
    public readonly organizationId: OrganizationId,
    public readonly memberId: MemberId
  ) {
    this.occurredAt = new Date();
  }
}

// 조직원 생성 데이터
export interface CreateOrganizationMemberData {
  id?: number;
  organizationId: number;
  memberId: number;
  role: string;
  status: string;
  joinedAt?: Date;
  updatedAt?: Date;
}

// 조직원 엔티티
export class OrganizationMember {
  private constructor(
    private readonly _id: OrganizationMemberId,
    private readonly _organizationId: OrganizationId,
    private readonly _memberId: MemberId,
    private readonly _role: OrganizationRoleVO,
    private _status: OrganizationMemberStatusVO,
    private readonly _joinedAt: Date,
    private _updatedAt: Date
  ) {}

  // 팩토리 메서드: 새 조직원 생성 (기본 PENDING 상태)
  static create(data: CreateOrganizationMemberData): OrganizationMember {
    const id = data.id
      ? OrganizationMemberId.create(data.id)
      : OrganizationMemberId.create(0);
    const organizationId = OrganizationId.create(data.organizationId);
    const memberId = MemberId.create(data.memberId);
    const role = OrganizationRoleVO.create(data.role);
    const status = OrganizationMemberStatusVO.create(data.status);
    const joinedAt = data.joinedAt ?? new Date();
    const updatedAt = data.updatedAt ?? new Date();

    return new OrganizationMember(
      id,
      organizationId,
      memberId,
      role,
      status,
      joinedAt,
      updatedAt
    );
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    organizationId: number;
    memberId: number;
    role: string;
    status: string;
    joinedAt: Date;
    updatedAt: Date;
  }): OrganizationMember {
    return OrganizationMember.create({
      id: data.id,
      organizationId: data.organizationId,
      memberId: data.memberId,
      role: data.role,
      status: data.status,
      joinedAt: data.joinedAt,
      updatedAt: data.updatedAt,
    });
  }

  // Getters
  get id(): OrganizationMemberId {
    return this._id;
  }

  get organizationId(): OrganizationId {
    return this._organizationId;
  }

  get memberId(): MemberId {
    return this._memberId;
  }

  get role(): OrganizationRoleVO {
    return this._role;
  }

  get status(): OrganizationMemberStatusVO {
    return this._status;
  }

  get joinedAt(): Date {
    return new Date(this._joinedAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // 비즈니스 로직: 멤버 승인
  approve(): void {
    if (!this._status.isPending()) {
      throw new Error('Only pending members can be approved');
    }
    this._status = OrganizationMemberStatusVO.approved();
    this._updatedAt = new Date();
  }

  // 비즈니스 로직: 멤버 거절
  reject(): void {
    if (!this._status.isPending()) {
      throw new Error('Only pending members can be rejected');
    }
    this._status = OrganizationMemberStatusVO.rejected();
    this._updatedAt = new Date();
  }

  // 비즈니스 로직: 멤버 비활성화
  deactivate(): void {
    if (!this._status.isApproved()) {
      throw new Error('Only approved members can be deactivated');
    }
    this._status = OrganizationMemberStatusVO.inactive();
    this._updatedAt = new Date();
  }

  // 비즈니스 로직: 역할 변경
  changeRole(newRole: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)._role = OrganizationRoleVO.create(newRole);
    this._updatedAt = new Date();
  }

  // 비즈니스 로직: 활성 멤버인지 확인
  isActiveMember(): boolean {
    return this._status.isApproved();
  }

  // 비즈니스 로직: 관리자 권한이 있는지 확인
  hasAdminPrivileges(): boolean {
    return this._role.canManageMembers();
  }

  // DTO로 변환
  toDTO(): OrganizationMemberDTO {
    return {
      id: this._id.value,
      organizationId: this._organizationId.value,
      memberId: this._memberId.value,
      role: this._role.value,
      status: this._status.value,
      joinedAt: this._joinedAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}

export interface OrganizationMemberDTO {
  id: number;
  organizationId: number;
  memberId: number;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  joinedAt: string;
  updatedAt: string;
}
