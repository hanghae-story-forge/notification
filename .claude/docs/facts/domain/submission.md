# Submission Domain - 제출 도메인

---
metadata:
  domain: Submission
  aggregate_root: Submission
  bounded_context: Submission Management
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

제출 도메인은 회원의 블로그 글 제출을 관리합니다. 각 제출은 특정 사이클(주차)에 연결되며, GitHub 댓글 ID로 중복을 방지합니다.

## Aggregate Root: Submission

- **Location**: `src/domain/submission/submission.domain.ts` (L53-L166)
- **Purpose**: 제출 엔티티 (Aggregate Root)
- **Factory Methods**:
  - `Submission.create(data)` - 새 제출 생성
  - `Submission.reconstitute(data)` - DB에서 조회한 엔티티 복원

### 속성 (Properties)

| Property | Type | Description |
|----------|------|-------------|
| `id` | `SubmissionId` | 제출 ID (EntityId 상속) |
| `_cycleId` | `CycleId` | 사이클 ID (Value Object) |
| `_memberId` | `MemberId` | 회원 ID (Value Object) |
| `_url` | `BlogUrl` | 블로그 URL (Value Object) |
| `_submittedAt` | `Date` | 제출 일시 |
| `_githubCommentId` | `GithubCommentId` | GitHub 댓글 ID (Value Object) |

### 비즈니스 로직 (Methods)

- **Location**: `src/domain/submission/submission.domain.ts` (L136-L155)
- `isSubmittedBy(memberId): boolean` - 특정 회원의 제출인지 확인
- `isForCycle(cycleId): boolean` - 특정 사이클의 제출인지 확인
- `toDTO(): SubmissionDTO` - DTO로 변환

## Value Objects

### BlogUrl

- **Location**: `src/domain/submission/submission.vo.ts` (L6-L41)
- **Purpose**: 블로그 URL
- **Validation**: http/https 프로토콜 (`InvalidBlogUrlError`)
- **Methods**:
  - `equals(other): boolean` - URL 비교
  - `toString(): string` - 문자열 반환

### GithubCommentId

- **Location**: `src/domain/submission/submission.vo.ts` (L44-L70)
- **Purpose**: GitHub 댓글 ID (중복 방지용)
- **Validation**: 공백 불가 (`InvalidGithubCommentIdError`)
- **Methods**:
  - `create(id): GithubCommentId` - string 또는 number에서 생성
  - `equals(other): boolean` - ID 비교

### Domain IDs

- **MemberId**: `src/domain/submission/submission.domain.ts` (L14-L18) - 회원 ID VO
- **CycleId**: `src/domain/submission/submission.domain.ts` (L21-L25) - 사이클 ID VO

## Domain Events

### SubmissionRecordedEvent

- **Location**: `src/domain/submission/submission.domain.ts` (L28-L40)
- **Purpose**: 제출 기록 시 발행 (Discord 알림 트리거)
- **Payload**:
  - `submissionId: SubmissionId`
  - `memberId: MemberId`
  - `cycleId: CycleId`
  - `url: BlogUrl`

## Repository Interface

### SubmissionRepository

- **Location**: `src/domain/submission/submission.repository.ts` (L10-L53)
- **Purpose**: 제출 리포지토리 인터페이스 (Domain 계층 정의)

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `save(submission)` | `Promise<void>` | 제출 저장 |
| `findById(id)` | `Promise<Submission \| null>` | ID로 제출 조회 |
| `findByCycleAndMember(cycleId, memberId)` | `Promise<Submission \| null>` | 사이클과 회원으로 조회 (중복 체크용) |
| `findByGithubCommentId(commentId)` | `Promise<Submission \| null>` | GitHub 댓글 ID로 조회 (중복 방지용) |
| `findByCycle(cycleId)` | `Promise<Submission[]>` | 사이클별 모든 제출 조회 |
| `findByCycleId(cycleId)` | `Promise<Submission[]>` | 사이클 ID로 모든 제출 조회 |
| `findByMember(memberId)` | `Promise<Submission[]>` | 회원별 모든 제출 조회 |
| `delete(id)` | `Promise<void>` | 제출 삭제 |

## Domain Service

### SubmissionService

- **Location**: `src/domain/submission/submission.service.ts` (L11-L78)
- **Purpose**: 제출 가능 여부 검증 및 통계 조회

### Methods

| Method | Description |
|--------|-------------|
| `canSubmit(cycleId, memberId, githubCommentId)` | 제출 가능 여부 확인 |
| `validateSubmission(cycleId, memberId, githubCommentId)` | 제출 가능 여부 검증 (불가능 시 에러) |
| `getCycleStats(cycleId)` | 사이클의 제출 통계 조회 |

## 비즈니스 규칙 (Constraints)

1. **중복 제출 방지**: 동일 회원은 동일 사이클에 한 번만 제출 가능
2. **GitHub 댓글 중복 방지**: 동일 GitHub 댓글 ID로 재제출 불가
3. **URL 검증**: http/https 프로토콜만 허용

## 관계

- **Cycle**: N:1 (여러 제출이 하나의 사이클에 속함)
- **Member**: N:1 (여러 제출이 한 회원에 속함)

## 사용 예시

### 제출 생성

```typescript
// Domain Layer에서 직접 생성
const submission = Submission.create({
  cycleId: 1,
  memberId: 1,
  url: 'https://blog.example.com/post',
  githubCommentId: '1234567890',
  submittedAt: new Date()
});

// 또는 Command 통해 생성 (권장)
const result = await recordSubmissionCommand.execute({
  githubUsername: 'john-doe',
  blogUrl: 'https://blog.example.com/post',
  githubCommentId: '1234567890',
  githubIssueUrl: 'https://github.com/org/repo/issues/1'
});
```

### 제출 가능 여부 확인

```typescript
// Service 통해 검증
const canSubmit = await submissionService.canSubmit(
  cycleId,
  memberId,
  githubCommentId
);

if (!canSubmit.canSubmit) {
  console.log(`제출 불가: ${canSubmit.reason}`);
}
```

### 제출 통계

```typescript
const stats = await submissionService.getCycleStats(cycleId);
console.log(`제출자: ${stats.totalSubmissions}명`);
console.log(`제출자 ID: ${stats.submittedMemberIds.map(id => id.value)}`);
```

### 제출 확인

```typescript
if (submission.isSubmittedBy(memberId)) {
  console.log('이 회원의 제출입니다');
}

if (submission.isForCycle(cycleId)) {
  console.log('이 사이클의 제출입니다');
}
```
