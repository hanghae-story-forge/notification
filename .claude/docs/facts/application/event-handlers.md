# Application Layer - Event Handlers

---
metadata:
  layer: Application
  component: Event Handlers
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

Event Handler는 도메인 이벤트를 수신하고 외부 시스템과 연동하는 역할을 합니다. 도메인 계층에서 발행한 이벤트를 구독하여 부수효과(side effects)를 처리합니다.

## Event Handler 목록

| Handler | 이벤트 | 목적 | Location |
|---------|--------|------|----------|
| `SubmissionEventHandler` | `SubmissionRecordedEvent` | 제출 알림 전송 | `application/event-handlers/submission-event.handler.ts` |

## SubmissionEventHandler

- **Location**: `src/application/event-handlers/submission-event.handler.ts` (L12-L32)
- **Purpose**: 제출 기록 시 Discord 알림 전송

### handleSubmissionRecorded()

제출 기록 이벤트를 처리하여 Discord 알림을 전송합니다.

```typescript
async handleSubmissionRecorded(
  event: SubmissionRecordedEvent,
  webhookUrl: string,
  memberName: string,
  cycleName: string,
  blogUrl: string
): Promise<void>
```

#### 실행 흐름

1. 도메인 이벤트 수신 (`SubmissionRecordedEvent`)
2. Discord 웹훅 클라이언트 호출
3. 제출 알림 메시지 전송

#### 의존성

- `IDiscordWebhookClient` - Discord 웹훅 인터페이스

### 사용 예시

```typescript
// Command 실행 후 도메인 이벤트 처리
const result = await recordSubmissionCommand.execute({
  githubUsername: 'john-doe',
  blogUrl: 'https://blog.example.com/post',
  githubCommentId: '1234567890',
  githubIssueUrl: 'https://github.com/org/repo/issues/1'
});

// 도메인 이벤트 수신
const events = result.submission.domainEvents;
for (const event of events) {
  if (event.type === 'SubmissionRecorded') {
    await submissionEventHandler.handleSubmissionRecorded(
      event,
      discordWebhookUrl,
      result.memberName,
      result.cycleName,
      result.blogUrl
    );
  }
}

// 이벤트 클리어
result.submission.clearDomainEvents();
```

## 이벤트 기반 아키텍처

### 이벤트 흐름

```
1. Presentation Layer (HTTP Handler)
   ↓
2. Application Layer (Command)
   ↓
3. Domain Layer (Aggregate Root)
   - 도메인 로직 실행
   - 도메인 이벤트 발행
   ↓
4. Application Layer (Event Handler)
   - 도메인 이벤트 수신
   - 외부 연동 (Discord, Email 등)
   ↓
5. Infrastructure Layer (External Service)
   - Discord Webhook 전송
```

### 이벤트 종류

| 이벤트 | 발생 위치 | 목적 |
|--------|-----------|------|
| `MemberRegisteredEvent` | Member 생성 | 회원 가입 알림 |
| `GenerationActivatedEvent` | 기수 활성화 | 기수 시작 알림 |
| `GenerationDeactivatedEvent` | 기수 비활성화 | 기수 종료 알림 |
| `CycleCreatedEvent` | 사이클 생성 | 주차 시작 알림 |
| `SubmissionRecordedEvent` | 제출 기록 | 제출 알림 |

## 이벤트 핸들러 구현 가이드

### 새로운 이벤트 핸들러 추가

1. **도메인 이벤트 정의** (`src/domain/*/xxx.domain.ts`)

```typescript
export class MyDomainEvent {
  readonly type = 'MyEvent' as const;
  readonly occurredAt: Date;

  constructor(public readonly data: any) {
    this.occurredAt = new Date();
  }
}
```

2. **이벤트 핸들러 구현** (`src/application/event-handlers/xxx.handler.ts`)

```typescript
export class MyEventHandler {
  constructor(private readonly externalService: IExternalService) {}

  async handleMyEvent(event: MyDomainEvent): Promise<void> {
    await this.externalService.doSomething(event.data);
  }
}
```

3. **Command에서 이벤트 발행** (`src/application/commands/xxx.command.ts`)

```typescript
// 도메인 이벤트 발행
entity.addDomainEvent(new MyDomainEvent(data));

// 저장
await repository.save(entity);

// 이벤트 처리
const events = entity.domainEvents;
for (const event of events) {
  await eventHandler.handle(event);
}

// 이벤트 클리어
entity.clearDomainEvents();
```

## 주의사항

1. **순서 보장**: 도메인 이벤트는 저장 후 처리되어야 함
2. **트랜잭션**: 이벤트 처리는 별도 트랜잭션에서 실행 고려
3. **에러 처리**: 이벤트 처리 실패 시 재시도 메커니즘 필요
4. **이벤트 클리어**: 이벤트 처리 후 반드시 `clearDomainEvents()` 호출

## 향후 확장

1. **Event Bus**: 메시지 큐(RabbitMQ, Redis) 도입으로 비동기 처리
2. **Event Sourcing**: 도메인 이벤트를 영속화하여 상태 재구성
3. **Saga Pattern**: 여러 애그리거트에 걸친 트랜잭션 처리
4. **CQRS Event Projection**: Query 전용 DB 별도 관리
