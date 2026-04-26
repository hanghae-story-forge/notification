# Study Operations 구현 로드맵

## Phase 0. 준비 완료

완료된 작업:

- repo clone
- branch 생성: `feat/ddd-study-operations-model`
- pnpm 설치
- dependencies install
- baseline `pnpm type-check` 통과
- baseline `pnpm test` 통과

## Phase 1. 설계 문서 고정

산출물:

- `docs/design/final-domain-model.md`
- `docs/design/technology-plan.md`
- `docs/design/implementation-roadmap.md`

목표:

- DB SSOT 원칙 명문화
- Aggregate/Entity/VO 확정
- GitHub/Discord sync 정책 확정
- 구현 순서 확정

## Phase 2. 안전한 Domain Slice 추가

목표:

기존 runtime route를 깨지 않고 신규 도메인 규칙을 pure TypeScript로 추가한다.

파일:

```text
apps/server/src/domain/study-operations/
  study-operations.domain.ts
  index.ts
  study-operations.test.ts
```

포함 규칙:

- Generation lifecycle/freeze
- Cycle lifecycle/period immutability
- Participant multi-role
- approved PARTICIPANT submission eligibility
- 3 consecutive missed cycles -> INACTIVE
- reminder offsets 72h/24h/6h/2h
- GitHub issue close -> CycleClosed
- other GitHub manual change -> drift

검증:

```bash
pnpm --filter @hanghae-study/server test
pnpm --filter @hanghae-study/server type-check
```

## Phase 3. Drizzle schema additive expansion

목표:

기존 테이블을 깨지 않고 최종 모델의 persistence 기반을 추가한다.

작업:

- 신규 enum 추가
- `studies` 추가
- `member_identities` 추가
- `generation_participants` 추가
- `generation_participant_roles` 추가
- `submission_candidates` 추가
- `submission_metadata` 추가
- reporting table 추가
- integration/outbox/log table 추가
- 기존 `generations`, `cycles`, `submissions`에 nullable/defaulted column 추가

금지:

- 기존 컬럼 rename/drop
- 기존 enum 값 변경
- 기존 repository 즉시 대규모 변경

## Phase 4. Application command skeleton

목표:

도메인 규칙을 use case로 감싼다.

Commands:

```text
CreateStudy
CreateGeneration
PlanGeneration
OpenCycle
CloseCycle
CompleteCycle
ApplyToGenerationFromDiscord
ApproveGenerationParticipant
RejectGenerationParticipant
ReactivateParticipant
RecordSubmissionFromGithubComment
UpdateSubmissionFromGithubCommentEdit
WithdrawSubmissionFromGithubCommentDelete
ApproveLateSubmission
CalculateCycleSubmissionStats
```

## Phase 5. Discord 신청/승인

목표:

Discord member 기준의 신청/승인 flow를 구현한다.

명령:

- `/기수신청`
- `/기수신청승인`
- `/기수신청거절`
- `/깃헙계정연결`

## Phase 6. GitHub Project/Issue projection

목표:

DB에서 생성된 Generation/Cycle을 GitHub에 자동 projection한다.

작업:

- GitHub Project 생성
- GitHub Issue 생성
- Project item 추가
- status/date/title sync
- issue body template 관리
- drift log 생성

## Phase 7. Submission 수집

목표:

GitHub 댓글에서 URL을 추출해 Submission으로 기록한다.

작업:

- comment created
- comment edited
- comment deleted
- URL 하나당 Submission 하나
- 매핑 없으면 SubmissionCandidate
- 승인된 PARTICIPANT만 accepted
- 지각 제출 승인 flow

## Phase 8. Reporting / Reminder / Inactive

목표:

운영 자동화와 통계 projection을 구현한다.

작업:

- cycle obligations snapshot
- participant cycle results
- submission stats
- deadline reminders: 3d/1d/6h/2h
- cycle summary notification
- 3 consecutive missed cycles -> INACTIVE

## Phase 9. Metadata / Public URL 검증

목표:

제출 URL metadata와 접근성 상태를 관리한다.

수집:

- resolved URL
- canonical URL
- domain
- title
- description
- og:image
- content type
- fetch status
- accessibility status

## Phase 10. 기존 GitHub 데이터 migration

목표:

현재 GitHub Projects/Issues/Comments를 DB SSOT 모델로 import한다.

순서:

1. Organization -> Study 생성
2. Project #2/#3/#4 -> Generation import
3. Issue -> Cycle import
4. Comment URL -> SubmissionCandidate import
5. GitHub username -> Discord Member mapping
6. Candidate -> Submission resolve
7. DB SSOT 전환
```
