// Organization Domain - 조직 도메인

import { EntityId, AggregateRoot } from '../common/types';
import {
  OrganizationName,
  OrganizationSlug,
  DiscordWebhookUrl,
} from './organization.vo';

// Organization ID
export class OrganizationId extends EntityId {
  static create(value: number): OrganizationId {
    return new OrganizationId(value);
  }
}

// 도메인 이벤트
export class OrganizationCreatedEvent {
  readonly type = 'OrganizationCreated' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly organizationId: OrganizationId,
    public readonly name: OrganizationName,
    public readonly slug: OrganizationSlug
  ) {
    this.occurredAt = new Date();
  }
}

export class OrganizationActivatedEvent {
  readonly type = 'OrganizationActivated' as const;
  readonly occurredAt: Date;

  constructor(public readonly organizationId: OrganizationId) {
    this.occurredAt = new Date();
  }
}

export class OrganizationDeactivatedEvent {
  readonly type = 'OrganizationDeactivated' as const;
  readonly occurredAt: Date;

  constructor(public readonly organizationId: OrganizationId) {
    this.occurredAt = new Date();
  }
}

// 조직 생성 데이터
export interface CreateOrganizationData {
  id?: number;
  name: string;
  slug?: string;
  discordWebhookUrl?: string;
  isActive?: boolean;
  createdAt?: Date;
}

// 조직 엔티티 (Aggregate Root)
export class Organization extends AggregateRoot<OrganizationId> {
  private constructor(
    id: OrganizationId,
    private readonly _name: OrganizationName,
    private readonly _slug: OrganizationSlug,
    private _discordWebhookUrl: DiscordWebhookUrl,
    private _isActive: boolean,
    private readonly _createdAt: Date
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 조직 생성
  static create(data: CreateOrganizationData): Organization {
    const name = OrganizationName.create(data.name);
    const slug = data.slug
      ? OrganizationSlug.create(data.slug)
      : OrganizationSlug.create(data.name);
    const discordWebhookUrl = DiscordWebhookUrl.create(
      data.discordWebhookUrl ?? null
    );

    const id = data.id
      ? OrganizationId.create(data.id)
      : OrganizationId.create(0);
    const isActive = data.isActive ?? true;
    const createdAt = data.createdAt ?? new Date();
    const organization = new Organization(
      id,
      name,
      slug,
      discordWebhookUrl,
      isActive,
      createdAt
    );

    // 도메인 이벤트 발행 (새 생성 시에만)
    if (data.id === 0) {
      organization.addDomainEvent(new OrganizationCreatedEvent(id, name, slug));
    }

    return organization;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    name: string;
    slug: string;
    discordWebhookUrl: string | null;
    isActive: boolean;
    createdAt: Date;
  }): Organization {
    return Organization.create({
      id: data.id,
      name: data.name,
      slug: data.slug,
      discordWebhookUrl: data.discordWebhookUrl ?? undefined,
      isActive: data.isActive,
      createdAt: data.createdAt,
    });
  }

  // Getters
  get name(): OrganizationName {
    return this._name;
  }

  get slug(): OrganizationSlug {
    return this._slug;
  }

  get discordWebhookUrl(): DiscordWebhookUrl {
    return this._discordWebhookUrl;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  // 비즈니스 로직: 조직 활성화
  activate(): void {
    if (this._isActive) {
      return; // 이미 활성화됨
    }
    this._isActive = true;
    this.addDomainEvent(new OrganizationActivatedEvent(this.id));
  }

  // 비즈니스 로직: 조직 비활성화
  deactivate(): void {
    if (!this._isActive) {
      return; // 이미 비활성화됨
    }
    this._isActive = false;
    this.addDomainEvent(new OrganizationDeactivatedEvent(this.id));
  }

  // 비즈니스 로직: Discord 웹훅 URL 업데이트
  updateDiscordWebhookUrl(url: string | null): void {
    this._discordWebhookUrl = DiscordWebhookUrl.create(url);
  }

  // DTO로 변환
  toDTO(): OrganizationDTO {
    return {
      id: this.id.value,
      name: this._name.value,
      slug: this._slug.value,
      discordWebhookUrl: this._discordWebhookUrl.valueOrNull,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
    };
  }
}

export interface OrganizationDTO {
  id: number;
  name: string;
  slug: string;
  discordWebhookUrl: string | null;
  isActive: boolean;
  createdAt: string;
}
