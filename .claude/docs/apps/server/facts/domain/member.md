# Member Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/member"
  source_files:
    apps/server/src/domain/member/member.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/member/member.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/member/member.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Member Entity

- **Location**: `apps/server/src/domain/member/member.domain.ts` (L42-L192)
- **Type**: Aggregate Root
- **Purpose**: 회원 엔티티 - Discord OAuth로 가입한 사용자를 나타냄

### Key Properties

- `id: MemberId` - 회원 ID (EntityId 상속)
- `_discordId: DiscordId` - Discord User ID (필수, 고유 식별자)
- `_discordUsername: DiscordUsername | null` - Discord 사용자명 (선택, 변경 가능)
- `_discordAvatar: string | null` - Discord 아바타 해시 (선택)
- `_githubUsername: GithubUsername | null` - GitHub 사용자명 (선택, 더 이상 unique 아님)
- `_name: MemberName` - 회원 이름 (필수)
- `_createdAt: Date` - 생성일시

### Factory Methods

#### `create(data: CreateMemberData): Member`

- **Purpose**: 새 회원 생성 (Discord OAuth로 가입)
- **Location**: L57-L86
- **Input**:
  - `id?: number` - ID (선택, 없으면 0으로 생성)
  - `discordId: string` - Discord ID (필수)
  - `discordUsername?: string` - Discord username (선택)
  - `discordAvatar?: string` - Discord avatar hash (선택)
  - `githubUsername?: string` - GitHub username (선택)
  - `name: string` - 이름 (필수)
  - `createdAt?: Date` - 생성일시 (선택)
- **Output**: Member entity
- **Domain Events**: `MemberRegisteredEvent` (새 생성 시에만)

#### `reconstitute(data): Member`

- **Purpose**: DB에서 조회한 엔티티 복원
- **Location**: L89-L119
- **Input**: DB 조회 데이터
- **Output**: Member entity (도메인 이벤트 없음)

### Business Logic

- `matchesDiscordId(discordId: string): boolean` - Discord ID로 회원 식별 (L147-L149)
- `hasGithubLinked(): boolean` - GitHub 사용자명 존재 여부 확인 (L152-L154)
- `updateGithubUsername(username: string): void` - GitHub 사용자명 업데이트 (L157-L159)
- `updateDiscordUsername(username: string): void` - Discord username 업데이트 (L162-L164)
- `updateDiscordAvatar(avatar: string): void` - Discord avatar 업데이트 (L167-L169)

### DTO

```typescript
interface MemberDTO {
  id: number;
  discordId: string;
  discordUsername?: string;
  discordAvatar?: string;
  githubUsername?: string;
  name: string;
}
```

## Member Value Objects

### MemberName

- **Location**: `apps/server/src/domain/member/member.vo.ts` (L5-L48)
- **Purpose**: 회원 이름 Value Object
- **Validation**:
  - 비어있을 수 없음 (trim 후 길이 체크)
  - 50자 초과 불가
- **Methods**:
  - `create(value: string): MemberName` - 생성 (검증 포함)
  - `reconstitute(value: string): MemberName` - DB 복원 (검증 없음)
  - `equals(other: MemberName): boolean`

### GithubUsername

- **Location**: `apps/server/src/domain/member/member.vo.ts` (L50-L88)
- **Purpose**: GitHub 사용자명 Value Object
- **Validation**:
  - GitHub username 정규식: `/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/`
  - 최대 39자
- **Methods**:
  - `create(value: string): GithubUsername`
  - `reconstitute(value: string): GithubUsername`
  - `equals(other: GithubUsername): boolean`

### DiscordId

- **Location**: `apps/server/src/domain/member/member.vo.ts` (L90-L138)
- **Purpose**: Discord ID Value Object (Snowflake ID)
- **Validation**:
  - 17-19자리 숫자: `/^\d{17,19}$/`
- **Methods**:
  - `create(value: string): DiscordId`
  - `reconstitute(value: string): DiscordId`
  - `createOrNull(value: string | null): DiscordId | null`
  - `equals(other: DiscordId | null): boolean`

### DiscordUsername

- **Location**: `apps/server/src/domain/member/member.vo.ts` (L140-L190)
- **Purpose**: Discord username Value Object
- **Validation**:
  - 2-32자, 알파벳/숫자/언더스코어만 허용: `/^[a-zA-Z0-9_]{2,32}$/`
- **Methods**:
  - `create(value: string): DiscordUsername`
  - `reconstitute(value: string): DiscordUsername`
  - `createOrNull(value: string | null): DiscordUsername | null`
  - `equals(other: DiscordUsername | null): boolean`

## Member Repository Interface

- **Location**: `apps/server/src/domain/member/member.repository.ts` (L1-L31)
- **Purpose**: 회원 저장소 인터페이스

### Methods

- `save(member: Member): Promise<void>` - 회원 저장 (생성 또는 업데이트)
- `findById(id: MemberId): Promise<Member | null>` - ID로 회원 조회
- `findByDiscordId(discordId: string): Promise<Member | null>` - Discord ID로 회원 조회 (주요 조회 방식)
- `findByGithubUsername(githubUsername: string): Promise<Member | null>` - GitHub 사용자명으로 회원 조회 (선택사항)
- `findAll(): Promise<Member[]>` - 전체 회원 조회

## Domain Events

### MemberRegisteredEvent

- **Location**: `apps/server/src/domain/member/member.domain.ts` (L19-L29)
- **Type**: `MemberRegistered` (const)
- **Properties**:
  - `memberId: MemberId`
  - `discordId: DiscordId`
  - `occurredAt: Date`
- **Trigger**: 새 회원 생성 시 (`data.id === 0`)

## Evidence

```typescript
// Member entity creation (L57-L86)
static create(data: CreateMemberData): Member {
  const discordId = DiscordId.create(data.discordId);
  const discordUsername = data.discordUsername
    ? DiscordUsername.create(data.discordUsername)
    : null;
  // ... value object creation
  const member = new Member(id, discordId, discordUsername, ...);

  if (data.id === 0) {
    member.addDomainEvent(new MemberRegisteredEvent(id, discordId));
  }

  return member;
}
```
