// OrganizationMember Value Objects

import { InvalidValueError } from '../common/errors';

// 조직원 상태 Enum
export enum OrganizationMemberStatus {
  PENDING = 'PENDING', // 가입 대기중
  APPROVED = 'APPROVED', // 승인됨 (활성 멤버)
  REJECTED = 'REJECTED', // 거절됨
  INACTIVE = 'INACTIVE', // 비활성화/탈퇴
}

// 조직원 역할 Enum
export enum OrganizationRole {
  OWNER = 'OWNER', // 조직 생성자 (최고 권한)
  ADMIN = 'ADMIN', // 관리자
  MEMBER = 'MEMBER', // 일반 멤버
}

// 조직원 상태 Value Object
export class OrganizationMemberStatusVO {
  private constructor(public readonly value: OrganizationMemberStatus) {}

  static create(value: string): OrganizationMemberStatusVO {
    const status = Object.values(OrganizationMemberStatus).find(
      (s) => s === value.toUpperCase()
    );

    if (!status) {
      throw new InvalidValueError(
        'Organization member status',
        value,
        `Invalid status. Must be one of: ${Object.values(OrganizationMemberStatus).join(', ')}`
      );
    }

    return new OrganizationMemberStatusVO(status as OrganizationMemberStatus);
  }

  static pending(): OrganizationMemberStatusVO {
    return new OrganizationMemberStatusVO(OrganizationMemberStatus.PENDING);
  }

  static approved(): OrganizationMemberStatusVO {
    return new OrganizationMemberStatusVO(OrganizationMemberStatus.APPROVED);
  }

  static rejected(): OrganizationMemberStatusVO {
    return new OrganizationMemberStatusVO(OrganizationMemberStatus.REJECTED);
  }

  static inactive(): OrganizationMemberStatusVO {
    return new OrganizationMemberStatusVO(OrganizationMemberStatus.INACTIVE);
  }

  equals(other: OrganizationMemberStatusVO): boolean {
    return this.value === other.value;
  }

  isPending(): boolean {
    return this.value === OrganizationMemberStatus.PENDING;
  }

  isApproved(): boolean {
    return this.value === OrganizationMemberStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.value === OrganizationMemberStatus.REJECTED;
  }

  isInactive(): boolean {
    return this.value === OrganizationMemberStatus.INACTIVE;
  }

  toString(): string {
    return this.value;
  }
}

// 조직원 역할 Value Object
export class OrganizationRoleVO {
  private constructor(public readonly value: OrganizationRole) {}

  static create(value: string): OrganizationRoleVO {
    const role = Object.values(OrganizationRole).find(
      (r) => r === value.toUpperCase()
    );

    if (!role) {
      throw new InvalidValueError(
        'Organization role',
        value,
        `Invalid role. Must be one of: ${Object.values(OrganizationRole).join(', ')}`
      );
    }

    return new OrganizationRoleVO(role as OrganizationRole);
  }

  static owner(): OrganizationRoleVO {
    return new OrganizationRoleVO(OrganizationRole.OWNER);
  }

  static admin(): OrganizationRoleVO {
    return new OrganizationRoleVO(OrganizationRole.ADMIN);
  }

  static member(): OrganizationRoleVO {
    return new OrganizationRoleVO(OrganizationRole.MEMBER);
  }

  equals(other: OrganizationRoleVO): boolean {
    return this.value === other.value;
  }

  isOwner(): boolean {
    return this.value === OrganizationRole.OWNER;
  }

  isAdmin(): boolean {
    return this.value === OrganizationRole.ADMIN;
  }

  isMember(): boolean {
    return this.value === OrganizationRole.MEMBER;
  }

  canManageMembers(): boolean {
    return (
      this.value === OrganizationRole.OWNER ||
      this.value === OrganizationRole.ADMIN
    );
  }

  toString(): string {
    return this.value;
  }
}
