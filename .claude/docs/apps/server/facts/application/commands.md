# CQRS Command Handlers

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/application/commands"
  source_files:
    apps/server/src/application/commands/record-submission.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/create-cycle.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/create-generation.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/create-member.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/create-organization.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/join-generation.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/join-organization.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/add-member-to-organization.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/commands/update-member-status.command.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## RecordSubmissionCommand

- **Location**: `apps/server/src/application/commands/record-submission.command.ts` (L47-L125)
- **Purpose**: 제출 기록 (GitHub Webhook에서 호출)
- **Input**: `RecordSubmissionRequest`
  - `githubUsername: string` - GitHub 사용자명
  - `blogUrl: string` - 블로그 글 URL
  - `githubCommentId: string` - GitHub 댓글 ID
  - `githubIssueUrl: string` - GitHub Issue URL
- **Output**: `RecordSubmissionResult`
  - `submission: Submission` - 생성된 제출
  - `memberName: string` - 회원 이름 (Discord 알림용)
  - `cycleName: string` - 사이클 이름
  - `organizationSlug: string` - 조직 식별자
- **Business Logic**:
  1. GitHub Issue URL에 해당하는 Cycle 찾기
  2. Cycle이 속한 Generation 찾기
  3. Generation이 속한 Organization 찾기
  4. GitHub Username으로 Member 찾기
  5. Member가 해당 Organization의 활성 멤버인지 확인
  6. 제출 가능 여부 검증 (중복 확인)
  7. Submission 생성 및 저장
  8. 도메인 이벤트 발행 (Discord 알림 등)
- **Dependencies**:
  - `CycleRepository`
  - `MemberRepository`
  - `SubmissionRepository`
  - `OrganizationMemberRepository`
  - `GenerationRepository`
  - `SubmissionService` - 제출 검증

## CreateCycleCommand

- **Location**: `apps/server/src/application/commands/create-cycle.command.ts` (L37-L100)
- **Purpose**: 사이클(주차) 생성 (기수에 속함)
- **Input**: `CreateCycleRequest`
  - `organizationSlug: string` - 조직 식별자
  - `week: number` - 주차 번호 (1, 2, 3...)
  - `startDate?: Date` - 시작일 (기본값: 현재)
  - `endDate?: Date` - 종료일 (기본값: 7일 후)
  - `githubIssueUrl: string` - GitHub Issue URL
- **Output**: `CreateCycleResult`
  - `cycle: Cycle` - 생성된 사이클
  - `generationName: string` - 기수명
- **Business Logic**:
  1. 조직 존재 확인
  2. 해당 조직의 활성화된 기수 찾기
  3. 이미 동일한 주차의 사이클이 있는지 확인
  4. 날짜 계산 (기본값: 현재부터 7일간)
  5. 사이클 생성 및 저장

## CreateGenerationCommand

- **Location**: `apps/server/src/application/commands/create-generation.command.ts` (L34-L92)
- **Purpose**: 기수 생성 (조직에 속함)
- **Input**: `CreateGenerationRequest`
  - `organizationSlug: string` - 조직 식별자
  - `name: string` - 기수명 (예: "똥글똥글 1기")
  - `startedAt: Date` - 시작일
  - `isActive?: boolean` - 활성화 여부 (기본값: false)
- **Output**: `CreateGenerationResult`
  - `generation: Generation` - 생성된 기수
- **Business Logic**:
  1. 조직 존재 확인
  2. 기수 이름 검증 (비어있지 않고 50자 이하)
  3. 활성화된 기수가 있는지 확인 (같은 조직 내)
  4. 기수 생성 및 저장

## CreateMemberCommand

- **Location**: `apps/server/src/application/commands/create-member.command.ts` (L31-L56)
- **Purpose**: 회원 생성 (GitHub username 기반)
- **Input**: `CreateMemberRequest`
  - `githubUsername: string` - GitHub 사용자명
  - `name: string` - 회원 실명
  - `discordId?: string` - Discord ID (선택, 없으면 자동 생성)
- **Output**: `CreateMemberResult`
  - `member: Member` - 생성된 회원
- **Business Logic**:
  1. 중복 회원 검사
  2. 회원 생성 (discordId는 필수이므로 기본값 제공)
  3. 회원 저장

## CreateOrganizationCommand

- **Location**: `apps/server/src/application/commands/create-organization.command.ts` (L30-L59)
- **Purpose**: 조직(스터디 그룹) 생성
- **Input**: `CreateOrganizationRequest`
  - `name: string` - 조직 이름
  - `slug?: string` - URL 식별자 (선택, 없으면 name에서 자동 생성)
  - `discordWebhookUrl?: string` - Discord 웹훅 URL
- **Output**: `CreateOrganizationResult`
  - `organization: Organization` - 생성된 조직 엔티티
- **Business Logic**:
  1. Slug 중복 검사
  2. 조직 생성 (자동으로 slug 생성됨)
  3. 조직 저장

## JoinOrganizationCommand

- **Location**: `apps/server/src/application/commands/join-organization.command.ts` (L42-L106)
- **Purpose**: 조직 가입 요청 (PENDING 상태로 생성)
- **Input**: `JoinOrganizationRequest`
  - `organizationSlug: string` - 조직 식별자
  - `memberDiscordId: string` - 회원 Discord ID
- **Output**: `JoinOrganizationResult`
  - `organizationMember: OrganizationMember` - 생성된 조직원 관계
  - `organization: Organization` - 조직 정보
  - `member: Member` - 회원 정보
  - `isNew: boolean` - 새로 생성된 조직원인지
- **Business Logic**:
  1. 조직 존재 확인
  2. 멤버 존재 확인 (없으면 에러)
  3. 이미 속해 있는지 확인
  4. PENDING 상태로 조직원 생성
  5. 저장

## AddMemberToOrganizationCommand

- **Location**: `apps/server/src/application/commands/add-member-to-organization.command.ts` (L42-L101)
- **Purpose**: 관리자가 조직에 멤버 추가 (PENDING 상태)
- **Input**: `AddMemberToOrganizationRequest`
  - `organizationSlug: string` - 조직 식별자
  - `memberId: number` - 회원 ID
  - `role?: OrganizationRole` - 역할 (기본값: MEMBER)
- **Output**: `AddMemberToOrganizationResult`
  - `organizationMember: OrganizationMember` - 생성된 조직원 관계
  - `organization: Organization` - 조직 정보
  - `member: Member` - 회원 정보
- **Business Logic**:
  1. 조직 존재 확인
  2. 멤버 존재 확인
  3. 이미 속해 있는지 확인
  4. 조직원 생성 (PENDING 상태)
  5. 저장

## JoinGenerationCommand

- **Location**: `apps/server/src/application/commands/join-generation.command.ts`
- **Purpose**: 기수에 가입
- **Input**: 기수 ID, 회원 ID
- **Output**: 생성된 GenerationMember

## UpdateMemberStatusCommand

- **Location**: `apps/server/src/application/commands/update-member-status.command.ts`
- **Purpose**: 조직원 상태 업데이트 (승인/거절/비활성화)
- **Input**: 조직원 ID, 새 상태
- **Output**: 업데이트된 조직원
