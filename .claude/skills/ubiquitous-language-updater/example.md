# 사용 예시

## 예시 1: 새로운 Payment 도메인 추가 시

### 입력 (도메인 코드)

```typescript
// apps/server/src/domain/payment/payment.domain.ts

export class PaymentId extends EntityId {
  static create(value: number): PaymentId {
    return new PaymentId(value);
  }
}

export class PaymentCompletedEvent {
  readonly type = 'PaymentCompleted' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly paymentId: PaymentId,
    public readonly amount: PaymentAmount
  ) {
    this.occurredAt = new Date();
  }
}

export class Payment extends AggregateRoot<PaymentId> {
  // ...

  complete(): void {
    this._status = 'COMPLETED';
    this.addDomainEvent(new PaymentCompletedEvent(this.id, this._amount));
  }
}
```

### 실행 명령

```
유비쿼터스 언어 업데이트해줘
```

### 출력 (문서 업데이트)

```
📋 도메인 변경 감지
  - 변경된 파일: apps/server/src/domain/payment/payment.domain.ts
  - 새로운 도메인: Payment (결제)

📝 유비쿼터스 언어 업데이트 완료
  - 추가된 도메인: 1개 (Payment)
  - 추가된 값 객체: 3개 (PaymentAmount, PaymentMethod, TransactionId)
  - 추가된 이벤트: 2개 (PaymentCompleted, PaymentFailed)
  - 추가된 용어: 5개

📄 문서 갱신: .claude/docs/ubiquitous-language/ubiquitous-language.md
```

---

## 예시 2: 변경 없을 때

### 실행 명령

```
도메인 변경사항을 문서에 반영해줘
```

### 출력

```
📋 도메인 변경 감지
  - 최근 커밋에서 domain/ 디렉토리 변경 없음

✨ 유비쿼터스 언어 문서는 최신 상태입니다.
```

---

## 예시 3: 기존 도메인에 새로운 메서드 추가 시

### 입력 (도메인 코드)

```typescript
// apps/server/src/domain/cycle/cycle.domain.ts

export class Cycle extends AggregateRoot<CycleId> {
  // 기존 코드...

  // 새로 추가된 비즈니스 로직
  extendDeadline(hours: number): void {
    const newEndDate = new Date(this._dateRange.endDate.getTime() + hours * 60 * 60 * 1000);
    this._dateRange = DateRange.create(this._dateRange.startDate, newEndDate);
  }
}
```

### 실행 명령

```
ubiquitous language update
```

### 출력

```
📋 도메인 변경 감지
  - 변경된 파일: apps/server/src/domain/cycle/cycle.domain.ts

📝 유비쿼터스 언어 업데이트 완료
  - 업데이트된 도메인: Cycle
  - 추가된 비즈니스 로직: extendDeadline() - 마감 연장

📄 문서 갱신: .claude/docs/ubiquitous-language/ubiquitous-language.md
```
