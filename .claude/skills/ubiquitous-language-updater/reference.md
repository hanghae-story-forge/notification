# 레퍼런스: 도메인 분석 가이드

## 도메인 파일 구조

```
apps/server/src/domain/
├── common/
│   └── types.ts           # EntityId, AggregateRoot 기반 타입
├── cycle/
│   ├── cycle.domain.ts    # Cycle 애그리거트
│   ├── vo/                # 값 객체 (Week, DateRange, GitHubIssueUrl)
│   └── cycle.repository.ts
├── member/
│   ├── member.domain.ts   # Member 애그리거트
│   ├── vo/                # 값 객체 (MemberName, DiscordId, etc.)
│   └── member.repository.ts
└── organization/
    ├── organization.domain.ts  # Organization 애그리거트
    ├── vo/                    # 값 객체 (OrganizationName, Slug, etc.)
    └── organization.repository.ts
```

## 분석 체크리스트

### 1. 새로운 도메인 감지

- `apps/server/src/domain/` 하위에 새로운 디렉토리가 생성되었는가?
- `*.domain.ts` 파일에 새로운 AggregateRoot 클래스가 있는가?
- 예: `class Payment extends AggregateRoot<PaymentId>`

### 2. 값 객체 추출

- `vo/` 하위에 새로운 파일이 있는가?
- 값 객체 클래스의 이름과 검증 규칙을 추출
- 예: `class PaymentAmount`, `class PaymentMethod`

### 3. 도메인 이벤트 추출

- `*Event`로 끝나는 클래스가 있는가?
- 예: `PaymentCompletedEvent`, `PaymentFailedEvent`
- 이벤트 발생 시점(생성자, activate(), 등)을 확인

### 4. 비즈니스 로직 추출

- 공개 메서드 중 비즈니스 로직을 담은 메서드
- 예: `getHoursRemaining()`, `isActive()`, `activate()`

### 5. 용어 추출

- 클래스명 → 영문 용어
- 한글 설명(주석, 변수명) → 한글 용어

## 문서 업데이트 포맷

### 새로운 도메인 추가

```markdown
### N. 도메인명 (DomainName)

도메인 설명

**속성**
- `property`: 설명

**비즈니스 로직**
- `method()`: 설명
```

### 값 객체 테이블에 추가

```markdown
| 도메인명 관련 | | | |
|-------------|------|-----------|-----------|
| `ValueObjectName` | 설명 | 검증 규칙 | 검증 규칙 |
```

### 도메인 이벤트에 추가

```markdown
| `EventName` | 발생 시점 | 설명 |
```

### 용어 사전에 추가

```markdown
| 한글 용어 | 영문 용어 | 설명 | 사용 예시 |
|-----------|-----------|------|-----------|
```
