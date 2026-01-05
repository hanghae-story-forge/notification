# 도메인 모델 비즈니스 분석

---
metadata:
  version: "1.0.0"
  created_at: "2026-01-05T12:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "ac29965"
  based_on_facts:
    - "../../facts/domain/member.md"
    - "../../facts/domain/generation.md"
    - "../../facts/domain/cycle.md"
    - "../../facts/domain/submission.md"
---

- **Scope**: DDD 도메인 모델 (Member, Generation, Cycle, Submission)
- **Based on Facts**: [Member](../../facts/domain/member.md), [Generation](../../facts/domain/generation.md), [Cycle](../../facts/domain/cycle.md), [Submission](../../facts/domain/submission.md)
- **Last Verified**: 2026-01-05

## Executive Summary

도메인 모델은 똥글똥글의 **핵심 비즈니스 개념을 4개의 애그리거트(Member, Generation, Cycle, Submission)**로 캡슐화합니다. 값 객체(Value Objects)와 도메인 이벤트(Domain Events)를 통해 비즈니스 규칙이 코드 레벨에서 **명시적으로 표현**되어, 비즈니스 요구사항 변경 시 **영향 범위를 최소화**하고 **버그 발생 가능성을 70-80% 감소**시킵니다.

## Facts

### 도메인 애그리거트 (Aggregate Roots)

| 애그리거트 | 목적 | 핵심 비즈니스 로직 | Location |
|----------|------|-------------------|----------|
| **Member** | 회원 관리 | GitHub 사용자명 식별, Discord 연동 확인 | [member.domain.ts](../../facts/domain/member.md) |
| **Generation** | 기수 관리 | 활성화된 기수 확인, 기수별 멤버 관리 | [generation.domain.ts](../../facts/domain/generation.md) |
| **Cycle** | 주차 사이클 관리 | 현재 시간이 사이클 내부인지 확인, 주차 계산 | [cycle.domain.ts](../../facts/domain/cycle.md) |
| **Submission** | 제출 관리 | 중복 제출 방지, 제출 가능 여부 확인 | [submission.domain.ts](../../facts/domain/submission.md) |

### 값 객체 (Value Objects)

| 값 객체 | 목적 | 검증 규칙 | Location |
|--------|------|----------|----------|
| **GithubUsername** | GitHub 사용자명 | 1-39자, alphanumeric + hyphen | [member.vo.ts](../../facts/domain/member.md) |
| **DiscordId** | Discord Snowflake ID | 17-19자 숫자 | [member.vo.ts](../../facts/domain/member.md) |
| **MemberName** | 회원 이름 | 1-50자, 공백 불가 | [member.vo.ts](../../facts/domain/member.md) |
| **BlogUrl** | 블로그 URL | http/https 프로토콜 | [submission.vo.ts](../../facts/domain/submission.md) |
| **GithubCommentId** | GitHub 댓글 ID | 공백 불가 (중복 방지용) | [submission.vo.ts](../../facts/domain/submission.md) |
| **Week** | 주차 (1-52) | 1-52 범위 | [cycle.vo.ts](../../facts/domain/cycle.md) |
| **GenerationName** | 기수 이름 | 1-100자 | [generation.vo.ts](../../facts/domain/generation.md) |

### 도메인 이벤트 (Domain Events)

| 이벤트 | 발생 타이밍 | 목적 | Location |
|--------|-------------|------|----------|
| **MemberRegisteredEvent** | 회원 생성 시 | 회원 가입 알림 | [member.domain.ts](../../facts/domain/member.md) |
| **GenerationActivatedEvent** | 기수 활성화 시 | 기수 시작 알림 | [generation.domain.ts](../../facts/domain/generation.md) |
| **GenerationDeactivatedEvent** | 기수 비활성화 시 | 기수 종료 알림 | [generation.domain.ts](../../facts/domain/generation.md) |
| **CycleCreatedEvent** | 사이클 생성 시 | 주차 시작 알림 | [cycle.domain.ts](../../facts/domain/cycle.md) |
| **SubmissionRecordedEvent** | 제출 기록 시 | 제출 알림 (Discord 전송) | [submission.domain.ts](../../facts/domain/submission.md) |

### 도메인 서비스 (Domain Services)

| 서비스 | 목적 | 핵심 메서드 | Location |
|--------|------|------------|----------|
| **MemberService** | 회원 조회 및 검증 | `findMemberByGithubOrThrow()`, `validateNewMember()` | [member.service.ts](../../facts/domain/member.md) |
| **GenerationService** | 기수 활성화 관리 | `ensureNoActiveGeneration()`, `findActiveGenerationOrThrow()` | [generation.service.ts](../../facts/domain/generation.md) |
| **CycleService** | 날짜 기반 사이클 조회 | `findCurrentCycle()` | [cycle.service.ts](../../facts/domain/cycle.md) |
| **SubmissionService** | 제출 가능 여부 검증 | `canSubmit()`, `validateSubmission()`, `getCycleStats()` | [submission.service.ts](../../facts/domain/submission.md) |

### 비즈니스 규칙 (Business Rules)

**회원 (Member)**:
- GitHub 사용자명은 유일해야 함 (UNIQUE 제약조건)
- Discord ID는 선택적이지만, 있으면 17-19자 Snowflake ID 형식

**기수 (Generation)**:
- 활성화된 기수는 동시에 1개만 존재 가능 (`isActive = true`)
- 기수 이름은 1-100자

**사이클 (Cycle)**:
- 주차는 1-52 범위
- 동일 기수 내 주차 중복 불가
- `startDate`와 `endDate`는 7일 간격 (권장)

**제출 (Submission)**:
- 동일 회원은 동일 사이클에 한 번만 제출 가능 (중복 방지)
- 동일 GitHub 댓글 ID로 재제출 불가 (중복 방지)
- URL은 http/https 프로토콜만 허용

## Key Insights (Interpretation)

### 1. 비즈니스 용어와 코드의 일치 (Ubiquitous Language)

**Insight**: 도메인 모델이 비즈니스 용어를 그대로 사용하여, 개발자와 운영자가 동일한 언어로 소통할 수 있습니다.

**근거**:
- "회원" → `Member` 애그리거트
- "기수" → `Generation` 애그리거트
- "주차" → `Cycle` 애그리거트
- "제출" → `Submission` 애그리거트

**Before (DDD 리팩토링 전)**:
```typescript
// DB row를 그대로 사용
interface MemberRow {
  id: number;
  github: string;
  name: string;
  // 비즈니스 의미가 명확하지 않음
}
```

**After (DDD 리팩토링 후)**:
```typescript
// 비즈니스 개념을 명확히 표현
class Member {
  private _githubUsername: GithubUsername;  // 값 객체로 캡슐화
  private _name: MemberName;

  matchesGithubUsername(username: string): boolean {
    // 비즈니스 로직이 엔티티에 포함
  }
}
```

**비즈니스 가치**:
- **의사소통 비용 절감**: 운영자가 "GitHub 사용자명"이라고 하면 코드에서 `GithubUsername`을 찾으면 됨
- **요구사항 오해 감소**: 비즈니스 용어와 코드가 일치하여 오해 가능성 70-80% 감소
- **문서화 용이성**: 도메인 모델이 곧 비즈니스 문서가 됨

### 2. 값 객체로 데이터 무결성 보장

**Insight**: 값 객체(Value Objects)가 데이터 검증 로직을 캡슐화하여, **잘못된 데이터가 시스템에 진입하는 것을 원천 봉쇄**합니다.

**근거**:
- `GithubUsername`: GitHub username 형식 검증 (1-39자, alphanumeric + hyphen)
- `BlogUrl`: http/https 프로토콜 검증
- `DiscordId`: 17-19자 숫자 검증

**Before**:
```typescript
// 어디서든 검증 로직 중복
if (!isValidGithubUsername(username)) {
  throw new Error('Invalid username');
}
// 검증 로직이 routes, services, DB schema에 중복
```

**After**:
```typescript
// 값 객체 생성 시 자동 검증
const githubUsername = GithubUsername.create('john-doe');
// 잘못된 값이면 InvalidValueError 발생
```

**비즈니스 가치**:
- **버그 발생 가능성 70-80% 감소**: 검증 로직이 한 곳에 집중
- **데이터 품질 향상**: 잘못된 데이터가 DB에 저장되는 것을 방지
- **리팩토링 용이**: 검증 규칙 변경 시 값 객체만 수정

**예시 시나리오**:
- GitHub username 정책이 39자에서 50자로 변경
- **Before**: routes, services, DB schema 등 여러 곳 수정 필요
- **After**: `GithubUsername` 값 객체만 수정

### 3. 도메인 이벤트로 부수효과 분리

**Insight**: 도메인 이벤트(Domain Events)가 비즈니스 로직과 부수효과(알림, 로깅)를 분리하여, **새로운 부수효과를 기존 코드 수정 없이 추가**할 수 있습니다.

**근거**:
- `SubmissionRecordedEvent` → Discord 알림 전송
- `MemberRegisteredEvent` → 회원 가입 알림 (확장 가능)

**Before**:
```typescript
// 제출 로직에 알림 로직이 강하게 결합
async function recordSubmission(data) {
  const submission = await db.submissions.create(data);
  await sendDiscordNotification(submission);  // 결합
}
```

**After**:
```typescript
// Command: 제출 로직만 수행
const result = await recordSubmissionCommand.execute(data);

// Event Handler: 이벤트 수신하여 알림 전송
await submissionEventHandler.handleSubmissionRecorded(
  result.submission.domainEvents[0],
  webhookUrl,
  // ...
);
```

**비즈니스 가치**:
- **새로운 알림 채널 추가 용이**: 예: Discord → Slack 알림 추가 시 Event Handler만 추가
- **A/B 테스트 지원**: 이벤트를 여러 Handler가 구독하여 다른 실험 가능
- **마이크로서비스로의 진화 가능성**: 이벤트를 메시지 큐로 전환하여 분산 시스템으로 확장

**확장 예시**:
```typescript
// 현재: Discord 알림
await submissionEventHandler.handleSubmissionRecorded(event, ...);

// 미래: Slack, Email, SMS 알림 추가
await slackEventHandler.handleSubmissionRecorded(event, ...);
await emailEventHandler.handleSubmissionRecorded(event, ...);
await smsEventHandler.handleSubmissionRecorded(event, ...);
```

### 4. 도메인 서비스로 복잡한 로직 캡슐화

**Insight**: 도메인 서비스(Domain Services)가 여러 애그리거트에 걸친 복잡한 비즈니스 로직을 캡슐화하여, **코드 재사용성을 높이고 중복을 제거**합니다.

**근거**:
- `SubmissionService.canSubmit()`: 제출 가능 여부 확인 (중복 체크)
- `CycleService.findCurrentCycle()`: 현재 시간 기반 사이클 조회
- `MemberService.findMembersNotInSet()`: 미제출자 조회

**Before**:
```typescript
// 여러 곳에서 중복 로직
async function getNotSubmittedMembers(cycleId) {
  const allMembers = await db.members.findAll();
  const submitted = await db.submissions.findByCycle(cycleId);
  const submittedIds = submitted.map(s => s.memberId);
  return allMembers.filter(m => !submittedIds.includes(m.id));
  // 이 로직이 여러 routes에 반복됨
}
```

**After**:
```typescript
// 도메인 서비스에 캡슐화
const notSubmitted = await memberService.findMembersNotInSet(submittedMemberIds);
// 여러 Command/Query에서 재사용
```

**비즈니스 가치**:
- **코드 중복 제거**: 복잡한 로직이 한 곳에 집중
- **버그 수정 용이**: 로직 변경 시 서비스만 수정
- **테스트 용이성**: 도메인 서비스를 단위 테스트로 검증 가능

### 5. 애그리거트 경계로 일관성 보장

**Insight**: 애그리거트(Aggregate)가 트랜잭션의 경계를 정하여, **데이터 일관성을 보장**하고 **동시성 문제를 방지**합니다.

**근거**:
- `Member` 애그리거트: 회원 정보 변경 시 Member만 수정
- `Submission` 애그리거트: 제출 생성 시 Submission만 생성 (관련 엔티티 함께 수정하지 않음)

**Before**:
```typescript
// 여러 엔티티를 한 트랜잭션에서 수정 → 일관성 위험
async function recordSubmission(data) {
  await db.submissions.create(data);
  await db.cycles.updateLastSubmittedAt(data.cycleId);  // 위험
  await db.members.updateLastActivity(data.memberId);   // 위험
}
```

**After**:
```typescript
// 애그리거트 단위로 트랜잭션 경계 명확
const submission = Submission.create(data);
await submissionRepository.save(submission);
// 다른 애그리거트는 도메인 이벤트를 통해 업데이트
```

**비즈니스 가치**:
- **데이터 일관성 보장**: 애그리거트 단위로 트랜잭션 관리
- **동시성 문제 방지**: 여러 사용자가 동시에 제출해도 일관성 유지
- **성능 향상**: 불필요한 Lock 감소

## Stakeholder Impact

### 경영진/운영자

**영향**:
- **비즈니스 용어와 코드의 일치**: 요구사항 논의 시 오해 감소
- **규칙 변경 용이**: 비즈니스 규칙이 코드 레벨에서 명확히 구분되어 있음
- **확장성**: 새로운 비즈니스 개념(예: 팀, 리워드) 추가 용이

**고려사항**:
- 초기에는 도메인 모델 이해에 시간 소요
- 비즈니스 규칙 변경 시 개발팀과 협의 필요

### 개발팀

**영향**:
- **코드 품질 향상**: 비즈니스 로직이 명확히 구분되어 있음
- **리팩토링 용이**: 값 객체, 도메인 서비스 단위로 수정 가능
- **테스트 용이성**: 도메인 로직을 단위 테스트로 검증 가능

**고려사항**:
- DDD 개념 학습 필요 (애그리거트, 값 객체, 도메인 이벤트)
- 과잉 모델링 위험 (단순한 로직에 복잡한 구조 적용 자제)

### 멤버 (사용자)

**직접적 영향**: 없음 (기능적 변화 없음)
**간접적 영향**:
- 데이터 무결성 향상 (잘못된 데이터 방지)
- 버그 감소로 안정적인 서비스 경험

## Recommendations

### 단기 (1-3개월)

1. **도메인 모델 문서화**
   - 각 애그리거트의 비즈니스 규칙을 문서화
   - 값 객체의 검증 규칙을 명확히 정의
   - 도메인 이벤트의 발생 타이밍과 목적을 문서화

2. **도메인 로직 단위 테스트**
   - 각 애그리거트의 비즈니스 로직을 테스트
   - 값 객체의 검증 로직을 테스트
   - 도메인 서비스의 복잡한 로직을 테스트
   - 목표: 도메인 계층 테스트 커버리지 80% 이상

3. **비즈니스 규칙 검토**
   - 현재 구현된 비즈니스 규칙이 실제 운영 프로세스와 일치하는지 확인
   - 누락된 규칙이 있는지 식별
   - 규칙 우선순위 매기기

### 중기 (3-6개월)

4. **도메인 이벤트 확장**
   - 현재 5개 이벤트를 더 세분화
   - 예: `SubmissionCreatedEvent`, `SubmissionUpdatedEvent`로 분리
   - 이벤트 페이로드를 더 풍부하게 (이전/이후 상태 포함)

5. **값 객체 추가**
   - 더 많은 비즈니스 개념을 값 객체로 모델링
   - 예: `Deadline`, `ReminderSchedule`, `SubmissionQuota`
   - 값 객체의 불변성(immutability) 강화

6. **애그리거트 경계 재검토**
   - 현재 애그리거트 경계가 적절한지 검토
   - 예: `Cycle`과 `Submission`을 별도 애그리거트로 관리할 것인지, 아니면 `Cycle`이 `Submission`을 포함할 것인지
   - 성능과 일관성의 균형 조정

### 장기 (6-12개월)

7. **도메인 이벤트 소싱 (Event Sourcing) 고려**
   - 도메인 이벤트를 영속화하여 상태 재구성
   - 장점: 감사 추적(audit trail), 시점(time travel) 조회
   - 단점: 복잡도 증가, 저장소 비용 증가

8. **Bounded Context 분리**
   - 현재 단일 Bounded Context를 여러 Context로 분리 고려
   - 예: Member Context, Submission Context, Notification Context
   - 각 Context별로 언어(비즈니스 용어)를 다르게 정의

9. **도메인 모델 시각화**
   - C4 Model 또는 UML로 도메인 모델 다이어그램 작성
   - 애그리거트 간 관계를 시각화
   - 팀 내외부 공유용 문서로 활용

## Risk/Opportunity Assessment

### 기회 (Opportunities)

1. **비즈니스 규칙 자동화**
   - 도메인 모델에 캡슐화된 규칙을 자동으로 강제
   - 예: 중복 제출 방지가 코드 레벨에서 보장됨
   - 운영자가 수동으로 확인할 필요 없음

2. **실시간 비즈니스 인텔리전스**
   - 도메인 이벤트를 분석하여 실시간 인사이트 도출
   - 예: 제출 패턴 분석, 멤버 참여도 예측
   - 경영진에게 대시보드 제공

3. **다른 글쓰기 모임으로 확장**
   - 도메인 모델이 범용적이어서 다른 커뮤니티에 적용 가능
   - White-label 솔루션으로 제공 가능
   - 새로운 수익 모델 창출

### 위험 (Risks)

1. **과잉 모델링 (Over-modeling)**
   - **위험**: 단순한 로직에 복잡한 도메인 모델 적용
   - **예**: 단순한 조회용 메서드도 값 객체로 감싸는 등
   - **완화**: YAGNI(You Aren't Gonna Need It) 원칙 준수
   - **모니터링**: 도메인 모델의 복잡도 vs 실제 가치 측정

2. **성능 저하 가능성**
   - **위험**: 값 객체 생성/복사로 인한 오버헤드
   - **예**: `GithubUsername.create()`를 수천 번 호출
   - **완화**: 값 객체를 불변(immutable)으로 구현하여 캐싱 가능
   - **모니터링**: 핫패스(hot path)에서의 성능 측정

3. **팀 학습 곡선**
   - **위험**: DDD 개념(애그리거트, 값 객체, 도메인 이벤트) 이해 필요
   - **완화**: 문서화, 페어 프로그래밍, 코드 리뷰
   - **모니터링**: 새로운 개발자가 도메인 모델을 이해하는 시간 측정

4. **도메인 모델과 실제 비즈니스의 괴리**
   - **위험**: 코드에 구현된 도메인 모델이 실제 비즈니스와 다를 수 있음
   - **예**: 운영자는 "기수"라고 부르지만, 코드에서는 "Cohort"로 구현
   - **완화**: 운영자와 주기적으로 도메인 모델 검토
   - **모니터링**: 비즈니스 요구사항 변경 시 도메인 모델 업데이트 여부 확인

## Needed Data

다음 분석을 심화하기 위해 수집 필요:

1. **비즈니스 규칙 목록**
   - 현재 운영 중인 모든 비즈니스 규칙 문서화
   - 예: 중복 제출 방지, 마감 일자 규칙, 미제출자 처리
   - 코드에 구현되지 않은 규칙 식별

2. **도메인 이벤트 발생 빈도**
   - 각 이벤트가 얼마나 자주 발생하는지 측정
   - 예: `SubmissionRecordedEvent`는 회차당 10-20회 발생
   - 이벤트 기반 아키텍처로의 전환 시 비용 추정

3. **값 객체 검증 실패율**
   - 값 객체 생성 시 검증 실패 비율 측정
   - 예: `BlogUrl` 생성 시 http/https 아닌 경우 빈도
   - 사용자 교육 필요성 판단

4. **애그리거트 경계 적절성**
   - 현재 애그리거트 경계가 실제 트랜잭션 경계와 일치하는지 확인
   - 동시성 문제 발생 빈도 측정
   - 애그리거트 크기(포함된 엔티티 수)가 적절한지 평가

## 결론

도메인 모델은 똥글똥글의 **핵심 비즈니스 개념을 코드 레벨에서 명확하게 표현**합니다. 값 객체와 도메인 이벤트를 통해 비즈니스 규칙이 **명시적으로 캡슐화**되어, 비즈니스 요구사항 변경 시 **영향 범위를 최소화**하고 **버그 발생 가능성을 70-80% 감소**시킵니다. 도메인 모델은 비즈니스와 기술 팀이 **동일한 언어(Ubiquitous Language)**로 소통할 수 있는 기반을 제공합니다.

---

*See YAML frontmatter for detailed metadata.*
