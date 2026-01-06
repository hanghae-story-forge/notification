# Member Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/member/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Member Entity

- **Location**: `apps/server/src/domain/member/member.domain.ts` (L42-L180)
- **Type**: Aggregate Root
- **Purpose**: 시스템의 회원을 나타내는 엔티티 (Discord 기반 인증)
- **Key Properties**:
  - `_discordId: DiscordId` - Discord User ID (고유 식별자, 필수)
  - `_discordUsername: DiscordUsername | null` - Discord 사용자명 (변경 가능)
  - `_discordAvatar: string | null` - Discord 아바타 해시
  - `_githubUsername: GithubUsername | null` - GitHub 사용자명 (선택, 더 이상 unique 아님)
  - `_name: MemberName` - 회원 실명
  - `_createdAt: Date` - 가입 일시
- **Domain Events**:
  - `MemberRegisteredEvent` - 회원 가입 시 발행
- **Business Logic**:
  - `matchesDiscordId(discordId)` - Discord ID로 회원 식별
  - `hasGithubLinked()` - GitHub 계정 연결 여부
  - `updateGithubUsername(username)` - GitHub 사용자명 업데이트
  - `updateDiscordUsername(username)` - Discord 사용자명 업데이트
  - `updateDiscordAvatar(avatar)` - Discord 아바타 업데이트
- **Evidence**:
  ```typescript
  // L56-L86: Member 팩토리 메서드
  static create(data: CreateMemberData): Member {
    const discordId = DiscordId.create(data.discordId);
    // ...
    if (data.id === 0) {
      member.addDomainEvent(new MemberRegisteredEvent(id, discordId));
    }
    return member;
  }
  ```

## MemberRepository Interface

- **Location**: `apps/server/src/domain/member/member.repository.ts`
- **Methods**:
  - `save(member): Promise<void>` - 회원 저장
  - `findById(id): Promise<Member | null>` - ID로 조회
  - `findByDiscordId(discordId): Promise<Member | null>` - Discord ID로 조회
  - `findByGithubUsername(githubUsername): Promise<Member | null>` - GitHub 사용자명으로 조회
  - `findAll(): Promise<Member[]>` - 전체 조회
