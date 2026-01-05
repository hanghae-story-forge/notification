# Member Domain - 회원 도메인

---
metadata:
  domain: Member
  aggregate_root: Member
  bounded_context: Member Management
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

회원 도메인은 똥글똥글에 참여하는 회원을 관리합니다. GitHub 사용자명을 식별자로 사용하며, Discord 연동을 지원합니다.

## Aggregate Root: Member

- **Location**: `src/domain/member/member.domain.ts` (L36-L118)
- **Purpose**: 회원 엔티티 (Aggregate Root)
- **Factory Methods**:
  - `Member.create(data)` - 새 회원 생성
  - `Member.reconstitute(data)` - DB에서 조회한 엔티티 복원

### 속성 (Properties)

| Property | Type | Description |
|----------|------|-------------|
| `id` | `MemberId` | 회원 ID (EntityId 상속) |
| `_githubUsername` | `GithubUsername` | GitHub 사용자명 (Value Object) |
| `_name` | `MemberName` | 회원 이름 (Value Object) |
| `_discordId` | `DiscordId \| null` | Discord ID (Value Object, nullable) |
| `_createdAt` | `Date` | 생성 일시 |

### 비즈니스 로직 (Methods)

- **Location**: `src/domain/member/member.domain.ts` (L100-L107)
- `matchesGithubUsername(username: string): boolean` - GitHub 사용자명으로 회원 식별
- `hasDiscordLinked(): boolean` - Discord 연동되어 있는지 확인
- `toDTO(): MemberDTO` - DTO로 변환

## Value Objects

### MemberName

- **Location**: `src/domain/member/member.vo.ts` (L6-L31)
- **Purpose**: 회원 이름 (1-50자, 공백 불가)
- **Validation**:
  - 공백 불가 (`InvalidValueError`)
  - 50자 초과 불가 (`InvalidValueError`)

### GithubUsername

- **Location**: `src/domain/member/member.vo.ts` (L34-L58)
- **Purpose**: GitHub 사용자명
- **Validation**: GitHub username 형식 (1-39자, alphanumeric + hyphen)

### DiscordId

- **Location**: `src/domain/member/member.vo.ts` (L61-L95)
- **Purpose**: Discord Snowflake ID
- **Validation**: 17-19자 숫자
- **Factory Methods**:
  - `DiscordId.create(value)` - 생성 (검증 포함)
  - `DiscordId.createOrNull(value)` - null 반환 허용

## Domain Events

### MemberRegisteredEvent

- **Location**: `src/domain/member/member.domain.ts` (L14-L24)
- **Purpose**: 새 회원 가입 시 발행
- **Payload**:
  - `memberId: MemberId`
  - `githubUsername: GithubUsername`

## Repository Interface

### MemberRepository

- **Location**: `src/domain/member/member.repository.ts` (L5-L30)
- **Purpose**: 회원 리포지토리 인터페이스 (Domain 계층 정의)

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `save(member)` | `Promise<void>` | 회원 저장 (생성 또는 업데이트) |
| `findById(id)` | `Promise<Member \| null>` | ID로 회원 조회 |
| `findByGithubUsername(githubUsername)` | `Promise<Member \| null>` | GitHub 사용자명으로 조회 |
| `findAll()` | `Promise<Member[]>` | 전체 회원 조회 |
| `findByDiscordId(discordId)` | `Promise<Member \| null>` | Discord ID로 조회 |

## Domain Service

### MemberService

- **Location**: `src/domain/member/member.service.ts` (L14-L78)
- **Purpose**: 회원 조회 및 검증 관련 비즈니스 로직

### Methods

| Method | Description |
|--------|-------------|
| `findMemberByGithubOrThrow(githubUsername)` | GitHub 사용자명으로 회원 찾기 (없으면 에러) |
| `findMemberByIdOrThrow(id)` | 회원 ID로 찾기 (없으면 에러) |
| `validateNewMember(githubUsername)` | 새 회원 생성 시 중복 검사 |
| `findMembersByGithubUsernames(usernames)` | 여러 GitHub 사용자명으로 회원들 조회 |
| `findMembersNotInSet(memberIds)` | 제출하지 않은 회원들 조회 |

## 관계

- **Generation**: N:M (via `generation_members` join table)
- **Submission**: 1:N (한 회원은 여러 제출 가능)

## 사용 예시

### 회원 생성

```typescript
// Domain Layer에서 직접 생성 (테스트용)
const member = Member.create({
  githubUsername: 'john-doe',
  name: 'John Doe',
  discordId: '123456789012345678'
});

// 또는 Command 통해 생성 (권장)
const result = await createMemberCommand.execute({
  githubUsername: 'john-doe',
  name: 'John Doe',
  discordId: '123456789012345678'
});
```

### 회원 조회

```typescript
// Service 통해 조회
const member = await memberService.findMemberByGithubOrThrow('john-doe');

if (member.hasDiscordLinked()) {
  console.log(`Discord ID: ${member.discordId}`);
}
```
