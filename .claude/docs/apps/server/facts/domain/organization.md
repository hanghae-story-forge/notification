# Organization Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/organization/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Organization Entity

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L1-L188)
- **Type**: Aggregate Root
- **Purpose**: 조직(스터디 그룹)을 나타내는 엔티티. 멀티 테넌트 시스템의 핵심 단위
- **Key Properties**:
  - `_name: OrganizationName` - 조직 이름 (1-100자, 필수)
  - `_slug: OrganizationSlug` - URL 식별자 (2-50자, 소문자 알파벳/숫자/하이픈)
  - `_discordWebhookUrl: DiscordWebhookUrl` - Discord 웹훅 URL (선택)
  - `_isActive: boolean` - 활성화 상태
  - `_createdAt: Date` - 생성 일시
- **Domain Events**:
  - `OrganizationCreatedEvent` - 조직 생성 시 발행
  - `OrganizationActivatedEvent` - 조직 활성화 시 발행
  - `OrganizationDeactivatedEvent` - 조직 비활성화 시 발행
- **Business Logic**:
  - `activate()` - 조직 활성화 (이미 활성화된 경우 무시)
  - `deactivate()` - 조직 비활성화 (이미 비활성화된 경우 무시)
  - `updateDiscordWebhookUrl(url)` - Discord 웹훅 URL 업데이트
- **Evidence**:
  ```typescript
  // L60-L102: Organization 엔티티와 팩토리 메서드
  export class Organization extends AggregateRoot<OrganizationId> {
    static create(data: CreateOrganizationData): Organization {
      const name = OrganizationName.create(data.name);
      const slug = data.slug
        ? OrganizationSlug.create(data.slug)
        : OrganizationSlug.create(data.name);
      // ...
      organization.addDomainEvent(new OrganizationCreatedEvent(id, name, slug));
      return organization;
    }
  }
  ```

## OrganizationId Value Object

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L10-L15)
- **Type**: EntityId (상속)
- **Purpose**: 조직의 고유 식별자
- **Evidence**:
  ```typescript
  export class OrganizationId extends EntityId {
    static create(value: number): OrganizationId {
      return new OrganizationId(value);
    }
  }
  ```

## OrganizationName Value Object

- **Location**: `apps/server/src/domain/organization/organization.vo.ts` (L5-L35)
- **Type**: Value Object
- **Purpose**: 조직 이름을 나타내는 값 객체 (빈 문자열, 100자 초과 불가)
- **Validation**:
  - 공백 제거 후 길이 검사
  - 최대 100자 제한
- **Evidence**:
  ```typescript
  export class OrganizationName {
    private constructor(public readonly value: string) {
      if (value.trim().length === 0) {
        throw new InvalidValueError('Organization name', value, 'Name cannot be empty');
      }
      if (value.length > 100) {
        throw new InvalidValueError('Organization name', value, 'Name cannot exceed 100 characters');
      }
    }
  }
  ```

## OrganizationSlug Value Object

- **Location**: `apps/server/src/domain/organization/organization.vo.ts` (L37-L71)
- **Type**: Value Object
- **Purpose**: URL 친화적인 조직 식별자 (한글 자동 변환 지원)
- **Validation**:
  - 소문자, 알파벳/숫자/하이픈만 허용
  - 2-50자 길이 제한
  - 한글 입력 시 자동으로 영문 하이픈 형식으로 변환
- **Evidence**:
  ```typescript
  export class OrganizationSlug {
    static create(value: string): OrganizationSlug {
      const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-zA-Z0-9가-힣\s-]/g, '') // 한글 유지
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/[^a-z0-9-]/g, ''); // 최종적으로 영문만
      return new OrganizationSlug(slug);
    }
  }
  ```

## DiscordWebhookUrl Value Object

- **Location**: `apps/server/src/domain/organization/organization.vo.ts` (L73-L112)
- **Type**: Value Object
- **Purpose**: Discord 웹훅 URL 유효성 검사
- **Validation**:
  - `discord.com` 호스트네임 검사
  - `/api/webhooks/` 경로 검사
  - null 허용 (선택적)
- **Evidence**:
  ```typescript
  export class DiscordWebhookUrl {
    private isValidDiscordWebhookUrl(url: string): boolean {
      try {
        const parsed = new URL(url);
        return (
          parsed.hostname === 'discord.com' &&
          parsed.pathname.startsWith('/api/webhooks/')
        );
      } catch {
        return false;
      }
    }
  }
  ```

## OrganizationRepository Interface

- **Location**: `apps/server/src/domain/organization/organization.repository.ts`
- **Purpose**: 조직 리포지토리 인터페이스 (추상화)
- **Methods**:
  - `save(organization): Promise<void>` - 조직 저장
  - `findById(id): Promise<Organization | null>` - ID로 조회
  - `findBySlug(slug): Promise<Organization | null>` - Slug으로 조회
  - `findAll(): Promise<Organization[]>` - 전체 조회
