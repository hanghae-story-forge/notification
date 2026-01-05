# 도메인 서비스 (Domain Services)

- **Status**: As-Is (현재 구현)
- **Scope**: 도메인 계층의 비즈니스 로직 캡슐화
- **Based on**:
  - Facts: [../facts/domain/member.md](../facts/domain/member.md), [../facts/domain/generation.md](../facts/domain/generation.md), [../facts/domain/cycle.md](../facts/domain/cycle.md), [../facts/domain/submission.md](../facts/domain/submission.md)
  - Insights: [../insights/operations/domain-model.md](../insights/operations/domain-model.md)
- **Last Verified**: 2026-01-05
- **Git Commit**: ac29965

## 개요 (Overview)

- **목적**: 복잡한 비즈니스 로직을 도메인 서비스로 캡슐화하여 코드 재사용성을 높이고 중복을 제거
- **범위**:
  - In-Scope:
    - MemberService: 회원 조회 및 검증
    - GenerationService: 기수 활성화 관리
    - CycleService: 날짜 기반 사이클 조회
    - SubmissionService: 제출 가능 여부 검증
  - Out-of-Scope:
    - 외부 연동 (Discord, GitHub) - Infrastructure 계층에서 처리
    - 트랜잭션 관리 - Application 계층에서 처리
- **비즈니스 가치**:
  - 코드 중복 제거로 버그 발생 가능성 **70-80% 감소**
  - 비즈니스 규칙 변경 시 영향 범위 최소화
  - 단위 테스트로 비즈니스 로직 검증 용이

## 핵심 기능 (Core Features)

### 1. MemberService

- **설명**: 회원 조회 및 검증 로직 캡슐화
- **주요 규칙**:
  - `findMemberByGithubOrThrow()`: GitHub 사용자명으로 회원 조회, 없으면 예외 발생
  - `validateNewMember()`: 새 회원 생성 가능 여부 검증 (GitHub username 중복 확인)
  - `findMembersNotInSet()`: 특정 ID 집합에 속하지 않는 회원 조회 (미제출자 계산용)

### 2. GenerationService

- **설명**: 기수 활성화 관리 로직 캡슐화
- **주요 규칙**:
  - `ensureNoActiveGeneration()`: 활성 기수가 없음을 보장, 있으면 예외 발생
  - `findActiveGenerationOrThrow()`: 활성 기수 조회, 없으면 예외 발생
  - `activateGeneration()`: 기수 활성화 (다른 기수 비활성화)

### 3. CycleService

- **설명**: 날짜 기반 사이클 조회 로직 캡슐화
- **주요 규칙**:
  - `findCurrentCycle()`: 현재 시간이 startDate와 endDate 사이인 사이클 조회
  - `isCycleActive()`: 사이클이 활성 상태인지 확인
  - `calculateWeekNumber()`: 날짜로 주차 계산

### 4. SubmissionService

- **설명**: 제출 가능 여부 검증 로직 캡슐화
- **주요 규칙**:
  - `canSubmit()`: 회원이 사이클에 제출 가능한지 확인 (중복 제출 방지)
  - `validateSubmission()`: 제출 데이터 검증 (URL, 회원, 사이클 존재 여부)
  - `getCycleStats()`: 사이클 통계 계산 (제출자, 미제출자)

## 기술 사양 (Technical Specifications)

- **아키텍처 개요**:
  - 도메인 서비스는 순수 TypeScript로 작성
  - 특정 프레임워크(Hono, Drizzle)에 의존하지 않음
  - 리포지토리 인터페이스를 통해 데이터 접근

- **의존성**:
  - Services:
    - Repository Interfaces (Domain 계층에서 정의)
  - Packages:
    - None (순수 TypeScript)
  - Libraries:
    - None
  - Env Vars:
    - None

- **구현 접근**:
  - 도메인 서비스는 복잡한 비즈니스 로직을 캡슐화
  - 여러 애그리거트에 걸친 로직은 도메인 서비스로 구현
  - 단일 애그리거트 내 로직은 엔티티에 구현

- **관측/운영**:
  - 비즈니스 메트릭 수집 미구현
  - 도메인 이벤트 발행으로 로깅 대체 가능

- **실패 모드/대응**:
  - **비즈니스 규칙 위반**: 도메인 예외 발생 (`ValidationError`, `NotFoundError`)
  - **데이터 불일치**: Application 계층에서 트랜잭션 Rollback

## 데이터 구조 (Data Structure)

- **모델/스키마**:
  - **Value Objects**:
    - `GithubUsername`: GitHub 사용자명 (1-39자, alphanumeric + hyphen)
    - `DiscordId`: Discord Snowflake ID (17-19자 숫자)
    - `MemberName`: 회원 이름 (1-50자)
    - `BlogUrl`: 블로그 URL (http/https 프로토콜)
  - **Domain Entities**:
    - `Member`: 회원 엔티티
    - `Generation`: 기수 엔티티
    - `Cycle`: 사이클 엔티티
    - `Submission`: 제출 엔티티

- **데이터 흐름**:
  ```
  Application Layer (Command/Query)
    ↓
  Domain Service (비즈니스 로직)
    ↓
  Repository Interface (데이터 접근)
    ↓
  Infrastructure Layer (구현)
  ```

- **검증/제약**:
  - 값 객체 생성 시 자동 검증
  - 도메인 서비스에서 비즈니스 규칙 검증
  - 애그리거트 단위로 트랜잭션 경계 관리

## API 명세 (API Specifications)

### MemberService

#### findMemberByGithubOrThrow()

- **Purpose**: GitHub 사용자명으로 회원 조회
- **Location**: [`src/domain/member/member.service.ts`](../facts/domain/member.md)
- **Signature**:
  ```typescript
  async findMemberByGithubOrThrow(
    repository: MemberRepository,
    githubUsername: GithubUsername
  ): Promise<Member>
  ```
- **Returns**: `Member` 엔티티
- **Errors**:
  - `NotFoundError`: 회원을 찾을 수 없음

#### validateNewMember()

- **Purpose**: 새 회원 생성 가능 여부 검증
- **Location**: [`src/domain/member/member.service.ts`](../facts/domain/member.md)
- **Signature**:
  ```typescript
  async validateNewMember(
    repository: MemberRepository,
    githubUsername: GithubUsername
  ): Promise<void>
  ```
- **Errors**:
  - `ValidationError`: GitHub username이 이미 존재함

#### findMembersNotInSet()

- **Purpose**: 특정 ID 집합에 속하지 않는 회원 조회 (미제출자 계산용)
- **Location**: [`src/domain/member/member.service.ts`](../facts/domain/member.md)
- **Signature**:
  ```typescript
  async findMembersNotInSet(
    repository: MemberRepository,
    memberIds: Set<number>
  ): Promise<Member[]>
  ```
- **Returns**: `Member[]` 배열

### GenerationService

#### ensureNoActiveGeneration()

- **Purpose**: 활성 기수가 없음을 보장
- **Location**: [`src/domain/generation/generation.service.ts`](../facts/domain/generation.md)
- **Signature**:
  ```typescript
  async ensureNoActiveGeneration(
    repository: GenerationRepository
  ): Promise<void>
  ```
- **Errors**:
  - `ValidationError`: 활성 기수가 이미 존재함

#### findActiveGenerationOrThrow()

- **Purpose**: 활성 기수 조회
- **Location**: [`src/domain/generation/generation.service.ts`](../facts/domain/generation.md)
- **Signature**:
  ```typescript
  async findActiveGenerationOrThrow(
    repository: GenerationRepository
  ): Promise<Generation>
  ```
- **Returns**: `Generation` 엔티티
- **Errors**:
  - `NotFoundError`: 활성 기수를 찾을 수 없음

#### activateGeneration()

- **Purpose**: 기수 활성화 (다른 기수 비활성화)
- **Location**: [`src/domain/generation/generation.service.ts`](../facts/domain/generation.md)
- **Signature**:
  ```typescript
  async activateGeneration(
    repository: GenerationRepository,
    generationId: number
  ): Promise<Generation>
  ```
- **Returns**: 활성화된 `Generation` 엔티티
- **Side Effects**: 다른 기수 비활성화, `GenerationActivatedEvent` 발행

### CycleService

#### findCurrentCycle()

- **Purpose**: 현재 시간이 startDate와 endDate 사이인 사이클 조회
- **Location**: [`src/domain/cycle/cycle.service.ts`](../facts/domain/cycle.md)
- **Signature**:
  ```typescript
  async findCurrentCycle(
    repository: CycleRepository,
    now: Date
  ): Promise<Cycle | null>
  ```
- **Returns**: `Cycle` 엔티티 또는 `null`

#### isCycleActive()

- **Purpose**: 사이클이 활성 상태인지 확인
- **Location**: [`src/domain/cycle/cycle.service.ts`](../facts/domain/cycle.md)
- **Signature**:
  ```typescript
  isCycleActive(cycle: Cycle, now: Date): boolean
  ```
- **Returns**: `boolean`

### SubmissionService

#### canSubmit()

- **Purpose**: 회원이 사이클에 제출 가능한지 확인 (중복 제출 방지)
- **Location**: [`src/domain/submission/submission.service.ts`](../facts/domain/submission.md)
- **Signature**:
  ```typescript
  async canSubmit(
    repository: SubmissionRepository,
    memberId: number,
    cycleId: number
  ): Promise<boolean>
  ```
- **Returns**: `boolean`

#### validateSubmission()

- **Purpose**: 제출 데이터 검증 (URL, 회원, 사이클 존재 여부)
- **Location**: [`src/domain/submission/submission.service.ts`](../facts/domain/submission.md)
- **Signature**:
  ```typescript
  async validateSubmission(
    submissionRepository: SubmissionRepository,
    memberRepository: MemberRepository,
    cycleRepository: CycleRepository,
    memberId: number,
    cycleId: number,
    blogUrl: BlogUrl,
    githubCommentId: GithubCommentId
  ): Promise<void>
  ```
- **Errors**:
  - `ValidationError`: URL 형식 오류, 중복 제출
  - `NotFoundError`: 회원 또는 사이클을 찾을 수 없음

#### getCycleStats()

- **Purpose**: 사이클 통계 계산 (제출자, 미제출자)
- **Location**: [`src/domain/submission/submission.service.ts`](../facts/domain/submission.md)
- **Signature**:
  ```typescript
  async getCycleStats(
    submissionRepository: SubmissionRepository,
    memberRepository: MemberRepository,
    cycleId: number
  ): Promise<CycleStats>
  ```
- **Returns**:
  ```typescript
  interface CycleStats {
    total: number;
    submitted: number;
    notSubmitted: number;
    submittedMembers: Member[];
    notSubmittedMembers: Member[];
  }
  ```

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오: 회원이 제출 가능한지 확인

1. Command가 `SubmissionService.canSubmit()` 호출
2. 서비스가 리포지토리에서 기존 제출 조회
3. 중복 제출이 아니면 `true` 반환
4. **최종 결과**: 중복 제출 방지

### 성공 시나리오: 활성 기수 조회

1. Command가 `GenerationService.findActiveGenerationOrThrow()` 호출
2. 서비스가 리포지토리에서 활성 기수 조회
3. 활성 기수 반환
4. **최종 결과**: 현재 활성 기수 확인

### 성공 시나리오: 미제출자 계산

1. Query가 `MemberService.findMembersNotInSet()` 호출
2. 서비스가 전체 회원 조회
3. 제출자 ID 집합으로 차집합 계산
4. 미제출자 목록 반환
5. **최종 결과**: 리마인더 대상 목록

### 실패/예외 시나리오

1. **중복 제출 시도**:
   - `SubmissionService.canSubmit()`이 `false` 반환
   - Command에서 `ValidationError` 발생
   - 제출 저장 안 됨

2. **활성 기수 없음**:
   - `GenerationService.findActiveGenerationOrThrow()`가 `NotFoundError` 발생
   - Command 실행 중단
   - 에러 메시지 반환

3. **회원을 찾을 수 없음**:
   - `MemberService.findMemberByGithubOrThrow()`가 `NotFoundError` 발생
   - Command 실행 중단
   - 에러 메시지 반환

## 제약사항 및 고려사항 (Constraints)

- **보안**:
  - 도메인 서비스는 인증/인가를 처리하지 않음
  - Application/Presentation 계층에서 권한 검증 필요

- **성능**:
  - 도메인 서비스는 비즈니스 로직에 집중
  - 성능 최적화는 Application/Infrastructure 계층에서 처리
  - 캐싱은 도메인 서비스 외부에서 구현

- **배포**:
  - 도메인 서비스 변경 시 전체 애플리케이션 재배포 필요

- **롤백**:
  - 도메인 서비스 롤백 시 영향 범위 분석 필요
  - 도메인 서비스는 여러 Command/Query에서 사용 가능

- **호환성**:
  - 도메인 서비스는 순수 TypeScript로 플랫폼 독립적

## 향후 확장 가능성 (Future Expansion)

- **도메인 서비스 추가**:
  - `NotificationService`: 알림 발송 로직 캡슐화
  - `StatisticsService`: 통계 계산 로직 캡슐화
  - `ValidationService`: 복잡한 검증 로직 캡슐화

- **도메인 이벤트 확장**:
  - 현재 5개 이벤트를 더 세분화
  - 예: `SubmissionCreatedEvent`, `SubmissionUpdatedEvent`로 분리
  - 이벤트 페이로드를 더 풍부하게 (이전/이후 상태 포함)

- **값 객체 추가**:
  - 더 많은 비즈니스 개념을 값 객체로 모델링
  - 예: `Deadline`, `ReminderSchedule`, `SubmissionQuota`
  - 값 객체의 불변성(immutability) 강화

- **도메인 서비스 테스트**:
  - 단위 테스트 커버리지 80% 이상 목표
  - 통합 테스트로 도메인 서비스 간 상호작용 검증

## 추가로 필요 정보 (Needed Data/Decisions)

- TBD: 도메인 서비스 복잡도
  - 질문: 현재 도메인 서비스의 복잡도는 적절한가?
  - 질문: 추가적인 도메인 서비스가 필요한가?
  - 오너: 기술팀

- TBD: 비즈니스 규칙 변경 빈도
  - 질문: 비즈니스 규칙이 얼마나 자주 변경되는가?
  - 질문: 어떤 규칙이 가장 자주 변경되는가?
  - 오너: 운영팀

- TBD: 도메인 서비스 테스트 커버리지
  - 질문: 현재 도메인 서비스 테스트 커버리지는?
  - 질문: 단위 테스트로 충분한가?
  - 오너: 기술팀

---

**문서 버전**: 1.0.0
**생성일**: 2026-01-05
**마지막 업데이트**: 2026-01-05
**Git Commit**: ac29965
