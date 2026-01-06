# Submission Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/submission/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Submission Entity

- **Location**: `apps/server/src/domain/submission/submission.domain.ts` (L52-L167)
- **Type**: Aggregate Root
- **Purpose**: 회원의 블로그 글 제출을 나타내는 엔티티
- **Key Properties**:
  - `_cycleId: CycleId` - 사이클 ID
  - `_memberId: MemberId` - 회원 ID
  - `_url: BlogUrl` - 블로그 글 URL
  - `_submittedAt: Date` - 제출 일시
  - `_githubCommentId: GithubCommentId` - GitHub 댓글 ID (중복 방지)
- **Domain Events**:
  - `SubmissionRecordedEvent` - 제출 기록 시 발행 (Discord 알림 트리거)
- **Business Logic**:
  - `isSubmittedBy(memberId)` - 특정 회원의 제출인지 확인
  - `isForCycle(cycleId)` - 특정 사이클의 제출인지 확인

## SubmissionRepository Interface

- **Location**: `apps/server/src/domain/submission/submission.repository.ts`
- **Methods**:
  - `save(submission): Promise<void>` - 제출 저장
  - `findById(id): Promise<Submission | null>` - ID로 조회
  - `findByCycleId(cycleId): Promise<Submission[]>` - 사이클별 제출 목록
  - `findByGithubCommentId(githubCommentId): Promise<Submission | null>` - GitHub 댓글 ID로 조회
