# Study Operations 최종 DDD 도메인 모델

## 1. 핵심 전제

- **DB가 SSOT(Source of Truth)** 이다.
- GitHub Project는 `Generation`의 협업용 projection이다.
- GitHub Issue는 `Cycle`의 협업용 projection이다.
- GitHub Issue Comment는 `Submission` 입력 채널이다.
- Discord Member가 `Member`의 기준 identity다.
- GitHub 계정은 제출 수집을 위한 외부 identity이며 변경 가능하다.
- Discord 공개 채널이 운영 command/notification surface다.

## 2. Bounded Context

### Study Operations Context

스터디, 기수, 회차, 참여자, 제출 의무를 관리한다.

주요 모델:

- `Study`
- `Generation`
- `Cycle`
- `Member`
- `MemberIdentity`
- `GenerationParticipant`
- `GenerationParticipantRole`

핵심 규칙:

- `Study`는 여러 `Generation`을 가진다.
- `Generation`은 특정 `Study`의 N기다.
- 기수 기본 회차 수는 8회다.
- 회차 기본 기간은 14일이다.
- 기수 기간은 포함된 회차의 시작/종료로 계산한다.
- 기수가 `COMPLETED`가 되면 freeze되어 수정 불가다.
- 회차 기간은 `SCHEDULED` 이후 변경 불가다.
- 방학은 별도 entity가 아니라 회차 간 공백으로 표현한다.

### Submission Management Context

GitHub 댓글에서 추출한 제출 URL, 후보 제출, 지각 승인, metadata 수집을 관리한다.

주요 모델:

- `Submission`
- `SubmissionCandidate`
- `SubmissionMetadata`
- `LateSubmissionApproval`

핵심 규칙:

- URL 하나가 `Submission` 하나다.
- 한 참여자는 한 회차에 여러 URL을 제출할 수 있다.
- 승인된 `PARTICIPANT` 역할 보유자만 제출 가능하다.
- 마감 이후 제출은 원칙적으로 불가능하며 운영자 승인 시 별도 지각 제출로 인정한다.
- 모든 URL 타입이 가능하지만 사람이 볼 수 있는 public URL이어야 한다.
- URL metadata를 수집한다.

### Reporting Context

회차별 제출 의무자 snapshot, 미제출자, 제출률, 연속 미제출, 기수 통계를 계산한다.

주요 모델:

- `CycleObligation`
- `ParticipantCycleResult`
- `CycleSubmissionStats`
- `ParticipantActivityStats`

핵심 규칙:

- 제출률은 사람 기준이다.
- 제출 개수는 URL 기준이다.
- 지각 제출은 정규 제출률과 별도 지표로 본다.
- 3회 연속 미제출 시 참여자는 `INACTIVE`가 된다.
- `INACTIVE` 복구는 운영자 수동 처리만 가능하다.
- `REMOVED` 이후 시작하는 회차는 제출 의무에서 제외하고, 이전 기록은 유지한다.

### GitHub Sync Context

DB 상태를 GitHub Project/Issue로 projection하고, GitHub 수동 변경 drift를 기록한다.

주요 모델:

- `GithubProjectRef`
- `GithubIssueRef`
- `GithubDriftLog`
- `OutboxEvent`

핵심 규칙:

- `Generation` 생성/계획 확정 시 GitHub Project를 자동 생성한다.
- `Cycle` 생성/스케줄 시 GitHub Issue를 자동 생성한다.
- Project status/date/title은 DB 기준으로 동기화한다.
- GitHub에서 수동 변경된 Project/Issue title/body/date/status는 drift로 기록하고 운영자에게 알린다.
- 단, GitHub Issue close는 `CycleClosed`로 반영한다.

### Discord Operations Context

Discord command와 공개 채널 알림을 담당한다.

주요 명령:

- `/기수신청`
- `/기수신청승인`
- `/기수신청거절`
- `/깃헙계정연결`
- `/회차현황`
- `/미제출자`
- `/지각제출승인`
- `/제출통계`
- `/회차열기`
- `/회차마감`
- `/기수종료`
- `/비활성해제`
- `/동기화상태`
- `/동기화재시도`

알림:

- 회차 시작 알림
- 마감 3일 전, 1일 전, 6시간 전, 2시간 전 리마인더
- 공개 채널 미제출자 멘션
- 회차 완료 요약
- GitHub drift 알림

## 3. Aggregate / Entity / Value Object

### Study Aggregate

```ts
Study {
  id: StudyId;
  organizationId: OrganizationId;
  name: StudyName;
  slug: StudySlug;
  defaultCycleCount: 8;
  defaultCycleDurationDays: 14;
  defaultInactiveThresholdMissedCycles: 3;
  defaultDiscordChannelId?: string;
  status: StudyStatus;
}
```

### Generation Aggregate

```ts
Generation {
  id: GenerationId;
  studyId: StudyId;
  organizationId: OrganizationId;
  ordinal: number;
  displayName: string;
  status: GenerationStatus;
  plannedCycleCount: number;
  cycleDurationDays: number;
  inactiveThresholdMissedCycles: number;
  githubProjectRef?: GithubProjectRef;
  discordChannelId?: string;
}
```

상태:

```text
DRAFT -> PLANNED -> ACTIVE -> COMPLETED
DRAFT/PLANNED/ACTIVE -> CANCELLED
```

### Cycle Aggregate

```ts
Cycle {
  id: CycleId;
  generationId: GenerationId;
  sequence: number;
  period: CyclePeriod;
  status: CycleStatus;
  titleOverride?: string;
  githubIssueRef?: GithubIssueRef;
  githubProjectItemId?: string;
}
```

상태:

```text
DRAFT -> SCHEDULED -> OPEN -> CLOSED -> COMPLETED
DRAFT/SCHEDULED/OPEN -> CANCELLED
```

### Member Aggregate

```ts
Member {
  id: MemberId;
  displayName: string;
  status: MemberStatus;
  identities: MemberIdentity[];
}
```

### MemberIdentity Entity

```ts
MemberIdentity {
  provider: 'DISCORD' | 'GITHUB';
  providerUserId: string;
  providerNodeId?: string;
  username?: string;
  displayName?: string;
  linkedAt: Date;
  unlinkedAt?: Date;
}
```

규칙:

- Discord identity는 시스템 전체에서 unique하다.
- GitHub identity는 numeric id/node id를 저장한다.
- GitHub username은 변경 가능하므로 unique 근거로 쓰지 않는다.

### GenerationParticipant Entity

```ts
GenerationParticipant {
  id: GenerationParticipantId;
  generationId: GenerationId;
  memberId: MemberId;
  status: ParticipantStatus;
  roles: ParticipantRole[];
  appliedAt: Date;
  approvedAt?: Date;
  removedAt?: Date;
  markedInactiveAt?: Date;
}
```

상태:

```text
APPLIED -> APPROVED -> INACTIVE -> APPROVED
APPLIED -> REJECTED
APPROVED/INACTIVE -> REMOVED
```

역할:

```text
OWNER
MANAGER
PARTICIPANT
OBSERVER
```

### Submission Aggregate

```ts
Submission {
  id: SubmissionId;
  cycleId: CycleId;
  generationId: GenerationId;
  participantId: GenerationParticipantId;
  memberId: MemberId;
  url: SubmissionUrl;
  normalizedUrl: string;
  status: SubmissionStatus;
  timingStatus: SubmissionTimingStatus;
  accessibilityStatus: UrlAccessibilityStatus;
  source: SubmissionSource;
  submittedAt: Date;
}
```

## 4. 핵심 Domain Events

### Generation / Cycle

- `StudyCreated`
- `GenerationCreated`
- `GenerationPlanned`
- `GenerationActivated`
- `GenerationCompleted`
- `GenerationCancelled`
- `CycleScheduled`
- `CycleOpened`
- `CycleClosed`
- `CycleCompleted`
- `CycleCancelled`

### Member / Participant

- `MemberCreated`
- `DiscordIdentityLinked`
- `GithubIdentityLinked`
- `GithubIdentityChanged`
- `GenerationParticipationApplied`
- `GenerationParticipationApproved`
- `GenerationParticipationRejected`
- `GenerationParticipantMarkedInactive`
- `GenerationParticipantReactivated`
- `GenerationParticipantRemoved`
- `GenerationParticipantRoleAssigned`

### Submission

- `SubmissionCandidateCreated`
- `SubmissionCandidateMappedToMember`
- `SubmissionRecorded`
- `SubmissionUpdatedFromCommentEdit`
- `SubmissionWithdrawnFromCommentDelete`
- `LateSubmissionRequested`
- `LateSubmissionApproved`
- `LateSubmissionRejected`
- `SubmissionMetadataFetchRequested`
- `SubmissionMetadataFetched`

### Integration / Notification

- `GithubProjectCreated`
- `GithubIssueCreated`
- `GithubProjectionSynced`
- `GithubDriftDetected`
- `CycleOpenedNotificationSent`
- `DeadlineReminderSent`
- `CycleSummaryNotificationSent`

## 5. 불변식 요약

1. DB가 SSOT다.
2. `Generation(COMPLETED)`는 freeze되어 수정할 수 없다.
3. `Cycle(SCHEDULED 이상)`은 기간을 변경할 수 없다.
4. 승인된 `PARTICIPANT` 역할 보유자만 제출할 수 있다.
5. Discord identity는 Member의 기준이며 unique하다.
6. GitHub identity는 mutable external identity다.
7. URL 하나가 Submission 하나다.
8. 마감 후 제출은 운영자 승인 없이는 인정되지 않는다.
9. public 접근 가능한 URL만 인정한다.
10. 3회 연속 미제출 시 `INACTIVE` 처리한다.
11. `INACTIVE` 복구는 운영자 수동 처리만 가능하다.
12. `REMOVED` 이후 시작하는 회차는 제출 의무에서 제외한다.
13. 제출률은 사람 기준, 제출 수는 URL 기준이다.
14. GitHub 수동 변경은 drift다.
15. 단 GitHub Issue close는 `CycleClosed`로 반영한다.
```
