# Application Layer - Commands (상태 변경 유스케이스)

---
metadata:
  layer: Application
  pattern: CQRS (Command)
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

Command는 시스템의 상태를 변경하는 유스케이스를 구현합니다. CQRS 패턴의 Command 부분으로, 비즈니스 로직을 조율하고 트랜잭션을 관리합니다.

## Command 목록

| Command | 목적 | Location |
|---------|------|----------|
| `RecordSubmissionCommand` | 제출 기록 | `application/commands/record-submission.command.ts` |
| `CreateMemberCommand` | 회원 생성 | `application/commands/create-member.command.ts` |
| `CreateCycleCommand` | 사이클 생성 | `application/commands/create-cycle.command.ts` |
| `CreateGenerationCommand` | 기수 생성 | `application/commands/create-generation.command.ts` |

## RecordSubmissionCommand

- **Location**: `src/application/commands/record-submission.command.ts` (L39-L90)
- **Purpose**: GitHub Issue 댓글을 통해 제출 기록
- **Use Case**: 회원이 GitHub Issue에 댓글로 블로그 URL을 남기면 제출로 기록

### Request

```typescript
interface RecordSubmissionRequest {
  githubUsername: string;      // GitHub 사용자명
  blogUrl: string;             // 블로그 URL
  githubCommentId: string;     // GitHub 댓글 ID (중복 방지)
  githubIssueUrl: string;      // GitHub Issue URL
}
```

### Result

```typescript
interface RecordSubmissionResult {
  submission: Submission;       // 생성된 제출 엔티티
  memberName: string;          // 회원 이름 (Discord 알림용)
  cycleName: string;           // 사이클 이름 (Discord 알림용)
}
```

### 실행 흐름

1. GitHub Issue URL로 Cycle 조회
2. GitHub Username으로 Member 조회
3. 제출 가능 여부 검증 (SubmissionService)
4. Submission 엔티티 생성
5. 저장 (Repository)
6. 도메인 이벤트 발행 (Discord 알림)

### 의존성

- `CycleRepository` - 사이클 조회
- `MemberRepository` - 회원 조회
- `SubmissionRepository` - 제출 저장
- `SubmissionService` - 제출 가능 여부 검증

### 에러 처리

- `NotFoundError` - 사이클 또는 회원을 찾을 수 없음
- `ConflictError` - 이미 제출됨 또는 GitHub 댓글 ID 중복

## CreateMemberCommand

- **Location**: `src/application/commands/create-member.command.ts` (L31-L55)
- **Purpose**: 새 회원 생성

### Request

```typescript
interface CreateMemberRequest {
  githubUsername: string;
  name: string;
  discordId?: string;
}
```

### Result

```typescript
interface CreateMemberResult {
  member: Member;
}
```

### 실행 흐름

1. 중복 회원 검사 (MemberService)
2. Member 엔티티 생성
3. 저장 (Repository)

### 의존성

- `MemberRepository` - 회원 저장
- `MemberService` - 중복 검사

### 에러 처리

- `ValidationError` - 회원 이미 존재

## CreateCycleCommand

- **Location**: `src/application/commands/create-cycle.command.ts` (L34-L81)
- **Purpose**: 새 사이클(주차) 생성
- **Use Case**: GitHub Issue 생성 시 자동으로 사이클 생성

### Request

```typescript
interface CreateCycleRequest {
  week: number;                // 주차 (1-52)
  startDate?: Date;            // 시작일 (기본값: 현재)
  endDate?: Date;              // 종료일 (기본값: 시작일 + 7일)
  githubIssueUrl: string;      // GitHub Issue URL
}
```

### Result

```typescript
interface CreateCycleResult {
  cycle: Cycle;
  generationName: string;       // 기수 이름
}
```

### 실행 흐름

1. 활성화된 기수 찾기
2. 동일 주차 중복 확인
3. 날짜 계산 (기본값: 7일)
4. Cycle 엔티티 생성
5. 저장 (Repository)

### 의존성

- `CycleRepository` - 사이클 저장, 중복 확인
- `GenerationRepository` - 활성화된 기수 조회

### 에러 처리

- `ConflictError` - 활성화된 기수 없음 또는 주차 중복

## CreateGenerationCommand

- **Location**: `src/application/commands/create-generation.command.ts` (L32-L68)
- **Purpose**: 새 기수 생성

### Request

```typescript
interface CreateGenerationRequest {
  name: string;
  startedAt: Date;
  isActive?: boolean;          // 기본값: false
}
```

### Result

```typescript
interface CreateGenerationResult {
  generation: Generation;
}
```

### 실행 흐름

1. 기수 이름 검증
2. 활성화된 기수가 있는지 확인 (isActive가 true인 경우)
3. Generation 엔티티 생성
4. 저장 (Repository)

### 의존성

- `GenerationRepository` - 기수 저장
- `GenerationService` - 활성화된 기수 확인

### 에러 처리

- `ValidationError` - 이름 형식 오류
- `ConflictError` - 활성화된 기수 이미 존재

## 사용 예시

### 제출 기록 (GitHub Webhook)

```typescript
const result = await recordSubmissionCommand.execute({
  githubUsername: 'john-doe',
  blogUrl: 'https://blog.example.com/post',
  githubCommentId: '1234567890',
  githubIssueUrl: 'https://github.com/org/repo/issues/1'
});

// Discord 알림 전송
await discordClient.sendSubmissionNotification(
  webhookUrl,
  result.memberName,
  result.cycleName,
  result.blogUrl
);
```

### 회원 생성

```typescript
const result = await createMemberCommand.execute({
  githubUsername: 'john-doe',
  name: 'John Doe',
  discordId: '123456789012345678'
});

console.log(`회원 생성됨: ${result.member.id.value}`);
```

### 사이클 생성 (GitHub Webhook)

```typescript
const result = await createCycleCommand.execute({
  week: 1,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-08'),
  githubIssueUrl: 'https://github.com/org/repo/issues/1'
});

console.log(`사이클 생성됨: ${result.generationName} - ${result.cycle.week.toNumber()}주차`);
```

## Command 패턴 특징

1. **단일 책임**: 각 Command는 하나의 유스케이스만 처리
2. **명시적 의존성**: 필요한 Repository와 Service만 주입
3. **불변 요청**: Request 인터페이스로 입력 명시
4. **명확한 결과**: Result 인터페이스로 출력 명시
5. **에러 처리**: 도메인 에러를 그대로 전파
