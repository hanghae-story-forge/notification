# Submission Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/submission"
  source_files:
    apps/server/src/domain/submission/submission.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/submission/submission.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/submission/submission.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/submission/submission.service.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Submission Entity

- **Location**: `apps/server/src/domain/submission/submission.domain.ts` (L52-L167)
- **Type**: Aggregate Root
- **Purpose**: 회원의 블로그 글 제출을 나타내는 엔티티

### Key Properties

- `id: SubmissionId` - 제출 ID (EntityId 상속)
- `_cycleId: CycleId` - 사이클 ID (외부 참조)
- `_memberId: MemberId` - 회원 ID (외부 참조)
- `_url: BlogUrl` - 블로그 글 URL
- `_submittedAt: Date` - 제출 일시
- `_githubCommentId: GithubCommentId` - GitHub 댓글 ID (중복 방지)

### Factory Methods

#### `create(data: CreateSubmissionData): Submission`

- **Purpose**: 새 제출 생성
- **Location**: L66-L90
- **Input**:
  - `id?: number` - ID (선택)
  - `cycleId: number` - 사이클 ID (필수)
  - `memberId: number` - 회원 ID (필수)
  - `url: string` - 블로그 URL (필수)
  - `submittedAt?: Date` - 제출일시 (선택)
  - `githubCommentId: string` - GitHub 댓글 ID (필수)
- **Output**: Submission entity
- **Domain Events**: `SubmissionRecordedEvent` (항상 발행)

#### `reconstitute(data): Submission`

- **Purpose**: DB에서 조회한 엔티티 복원
- **Location**: L93-L112
- **Input**: DB 조회 데이터
- **Output**: Submission entity (도메인 이벤트 없음)

### Business Logic

- `isSubmittedBy(memberId: MemberId): boolean` - 특정 회원의 제출인지 확인 (L136-L138)
- `isForCycle(cycleId: CycleId): boolean` - 특정 사이클의 제출인지 확인 (L141-L143)

### DTO

```typescript
interface SubmissionDTO {
  id: number;
  cycleId: number;
  memberId: number;
  url: string;
  submittedAt: string;
  githubCommentId: string;
}
```

## Submission Value Objects

### BlogUrl

- **Location**: `apps/server/src/domain/submission/submission.vo.ts` (L5-L41)
- **Purpose**: 블로그 URL Value Object
- **Validation**: http 또는 https 프로토콜의 유효한 URL
- **Custom Error**: `InvalidBlogUrlError`
- **Methods**:
  - `create(url: string): BlogUrl`
  - `equals(other: BlogUrl): boolean`
  - `toString(): string`

### GithubCommentId

- **Location**: `apps/server/src/domain/submission/submission.vo.ts` (L43-L70)
- **Purpose**: GitHub 댓글 ID Value Object
- **Validation**: 비어있지 않은 문자열
- **Custom Error**: `InvalidGithubCommentIdError`
- **Methods**:
  - `create(id: string | number): GithubCommentId`
  - `equals(other: GithubCommentId): boolean`
  - `toString(): string`

## Submission Repository Interface

- **Location**: `apps/server/src/domain/submission/submission.repository.ts`
- **Purpose**: 제출 저장소 인터페이스

### Methods

- `save(submission: Submission): Promise<void>` - 제출 저장
- `findById(id: SubmissionId): Promise<Submission | null>` - ID로 조회
- `findByCycleId(cycleId: CycleId): Promise<Submission[]>` - 사이클별 제출 조회
- `findByMemberId(memberId: MemberId): Promise<Submission[]>` - 회원별 제출 조회
- `findByCycleAndMember(cycleId: CycleId, memberId: MemberId): Promise<Submission | null>` - 사이클+회원으로 조회
- `findByGithubCommentId(commentId: string): Promise<Submission | null>` - GitHub 댓글 ID로 조회
- `existsByGithubCommentId(commentId: string): Promise<boolean>` - GitHub 댓글 ID 중복 체크

## Submission Service

- **Location**: `apps/server/src/domain/submission/submission.service.ts`
- **Purpose**: 제출 관련 도메인 서비스

### Methods

- `validateSubmission(cycleId: CycleId, memberId: MemberId, githubCommentId: string): Promise<void>` - 제출 가능 여부 검증 (이미 제출했는지, 댓글 ID 중복 체크)

## Domain Events

### SubmissionRecordedEvent

- **Location**: `apps/server/src/domain/submission/submission.domain.ts` (L28-L40)
- **Type**: `SubmissionRecorded` (const)
- **Properties**:
  - `submissionId: SubmissionId`
  - `memberId: MemberId`
  - `cycleId: CycleId`
  - `url: BlogUrl`
  - `occurredAt: Date`
- **Trigger**: 제출 생성 시 (항상 발행)

## Evidence

```typescript
// Submission entity creation (L66-L90)
static create(data: CreateSubmissionData): Submission {
  const blogUrl = BlogUrl.create(data.url);
  const commentId = GithubCommentId.create(data.githubCommentId);

  const id = data.id ? SubmissionId.create(data.id) : SubmissionId.create(0);
  const cycleId = CycleId.create(data.cycleId);
  const memberId = MemberId.create(data.memberId);
  const submittedAt = data.submittedAt ?? new Date();

  const submission = new Submission(id, cycleId, memberId, blogUrl, submittedAt, commentId);

  // 도메인 이벤트 발행 (항상)
  submission.addDomainEvent(new SubmissionRecordedEvent(id, memberId, cycleId, blogUrl));

  return submission;
}
```
