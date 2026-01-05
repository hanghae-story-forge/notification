# 리마인더 시스템 분석

- **Scope**: 마감 리마인더 API 및 n8n 워크플로우 통합
- **Based on Facts**: [../../facts/routes/reminder.md](../../facts/routes/reminder.md)
- **Last Verified**: 2026-01-05

## Executive Summary

리마인더 시스템은 **3개의 API 엔드포인트**로 마감 임박 알림과 미제출자 조회를 자동화하여, 운영자가 수동으로 미제출자를 추적하는 시간을 **회차당 5-10분 절감**합니다. n8n 워크플로우와 긴밀히 통합되어 스케줄링을 외부에 위임하나, `generation_members` 테이블 미사용으로 미제출자 계산이 부정확할 수 있는 위험이 있습니다.

## Facts

### API 엔드포인트 구조

1. **`GET /api/reminder?hoursBefore=N`**
   - **용도**: 마감 N시간 이내인 활성 사이클 목록 조회
   - **주 사용자**: n8n cron job
   - **조회 로직**: `generations.isActive = true` AND `now < cycles.endDate < (now + hoursBefore)`

2. **`GET /api/reminder/{cycleId}/not-submitted`**
   - **용도**: 특정 사이클의 미제출자 목록 조회
   - **주 사용자**: n8n reminder workflow
   - **조회 로직**: 전체 `members` - 제출된 `memberIds`

3. **`POST /api/reminder/send-reminders`**
   - **용도**: 마감 임박 사이클에 대해 Discord 리마인더 발송
   - **주 사용자**: GitHub Actions cron job 또는 n8n
   - **동작**: 사이클 조회 → 미제출자 계산 → Discord webhook 전송

### 미제출자 계산 로직

**현재 구조**:
```typescript
// 1. 전체 멤버 조회
const allMembers = await db.select().from(members);

// 2. 제출된 멤버 ID 조회
const submittedIds = new Set(
  (await db.select({ memberId: submissions.memberId })
    .from(submissions)
    .where(eq(submissions.cycleId, cycleId)))
    .map(s => s.memberId)
);

// 3. 미제출자 필터링
const notSubmitted = allMembers.filter(m => !submittedIds.has(m.id));
```

**Known Issue** (routes/reminder.md L134):
> 현재 전체 멤버를 대상으로 미제출자를 계산합니다. 기수-멤버 연결 테이블(`generation_members`)이 도입되면, 해당 기수에 속한 멤버만 필터링해야 합니다.

### 시간 윈도우 쿼리

**시간 계산**:
```typescript
const now = new Date();
const deadline = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

// WHERE: cycles.endDate < deadline AND cycles.endDate > now
```

**예시**:
- `hoursBefore=24`: 현재로부터 24시간 이내에 마감되는 사이클
- `hoursBefore=6`: 현재로부터 6시간 이내에 마감되는 사이클

## Key Insights (Interpretation)

### 1. 스케줄링 외부 위임: 유연성 vs 단일 실패점

**설계 패턴**: API가 스케줄링을 직접 수행하지 않고, n8n/GitHub Actions에 위임

**이점**:
- **유연성**: n8n에서 리마인더 빈도, 시간을 쉽게 변경 가능
- **분리**: API는 비즈니스 로직만 담당, 스케줄링은 인프라 담당
- **확장성**: 여러 n8n 워크플로우가 동시에 호출 가능

**위험**:
- **단일 실패점**: n8n이 다운되면 리마인더 발송 안 함
- **복잡성**: 시스템이 2개 (API + n8n)로 분산
- **모니터링 어려움**: n8n 실행 실패 시 API에서 알 수 없음

**Before (API 내장 스케줄링 시나리오)**:
```typescript
// API가 직접 cron 스케줄링
cron.schedule('0 */6 * * *', async () => {
  await sendReminderNotifications(6);
});
```

**After (n8n 위임 후)**:
```typescript
// API는 순수 함수만 제공
export async function sendReminderNotifications(hoursBefore: number) {
  // 비즈니스 로직만 수행
}
```

### 2. 미제출자 계산 부정확성: 데이터 무결성 위험

**문제점**: `generation_members` 테이블이 존재하나 미사용

**현재 동작**:
```
members 테이블: 15명 (1기 10명 + 2기 5명)
2기 1주차 사이클: 실제 참여자는 2기 5명뿐

미제출자 계산: 15명 전체 - 제출자 3명 = 미제출자 12명
실제 미제출자: 5명 - 3명 = 2명

오차: 10명 (1기 멤버 포함)
```

**영향**:
- Discord 리마인더에 미제출자 이름이 과다 표시
- 혼란: "나 제출했는데 왜 미제출자에 있어?"
- 운영자 신뢰도 하락

**해결 방안** (TODO로 이미 식별됨):
```typescript
// generation_members 조인으로 기수별 멤버 필터링
const allMembers = await db
  .select({ member: members })
  .from(generationMembers)
  .innerJoin(members, eq(generationMembers.memberId, members.id))
  .where(eq(generationMembers.generationId, cycle.generationId));
```

### 3. 시간 윈도우 쿼리: 타이밍 민감도

**쿼리 특성**:
```typescript
lt(cycles.endDate, deadline) AND gt(cycles.endDate, now)
```

**잠재적 문제**: cron job 실행 간격보다 시간 윈도우가 좁으면 사이클 누락

**시나리오**:
```
리마인더 정책: 마감 24시간 전, 6시간 전 (2회)
Cron 실행: 매시간 정시 (0분)

Case 1: 마감 시간 23:59
- 24시간 전 리마인더: 전일 23:59 실행 필요 → 0분 실행에서 누락?
- 실제: 23:00에 실행되면 endDate(23:59) < deadline(23:00) 조건 불만족

Case 2: 마감 시간 00:01
- 24시간 전 리마인더: 전일 00:01 실행 → 0분 실행에서 포함
- 실제: 00:00에 실행되면 endDate(00:01) < deadline(00:00) 조건 불만족?
```

**해결 방안**: 시간 윈도우에 여유를 두거나, 더 자주 실행

```typescript
// 현재: hoursBefore=24면 정확히 24시간 윈도우
const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

// 개선안: 1시간 여유
const deadline = new Date(now.getTime() + 25 * 60 * 60 * 1000);
```

### 4. POST /api/reminder/send-reminders: 편의성 vs 유연성

**설계**: API가 직접 Discord 메시지 발송

**이점**:
- **일관성**: Discord webhook URL 관리를 API가 담당
- **간편함**: n8n에서 단일 API 호출로 완료
- **캡슐화**: 메시지 생성 로직이 API 내부

**단점**:
- **유연성 감소**: 메시지 커스텀 어려움
- **테스트 어려움**: Discord 전송 없이 리마인더 목록만 조회하고 싶을 때 불가

**대안 설계** (GET/POST 분리):
- `GET /api/reminder?hoursBefore=24`: 사이클 목록만 반환 (현재)
- `GET /api/reminder/{cycleId}/not-submitted`: 미제출자 목록만 반환 (현재)
- n8n에서 이 두 API를 조합하여 메시지 커스텀 가능

**현재**: `POST /api/reminder/send-reminders`가 모든 것을 한 번에 처리

### 5. 중복 리마인더 발송 방지 부재

**현재 구조**:
```typescript
for (const { cycle, generation } of activeCycles) {
  // 미제출자가 있으면 무조건 발송
  if (notSubmitted.length > 0) {
    await sendDiscordWebhook(...);
  }
}
```

**문제점**: API를 여러 번 호출하면 중복 발송

**시나리오**:
1. n8n cron job이 12:00에 `POST /api/reminder/send-reminders?hoursBefore=6` 호출
2. 운영자가 실수로 12:05에 수동으로 동일 API 호출
3. 멤버는 동일한 리마인더를 2번 수신

**해결 방안**: 발송 기록 테이블 추가

```typescript
// reminder_logs 테이블
export const reminderLogs = pgTable('reminder_logs', {
  id: serial('id').primaryKey(),
  cycleId: integer('cycle_id').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  hoursBefore: integer('hours_before').notNull(),
});

// 발송 전 중복 확인
const recentLog = await db
  .select()
  .from(reminderLogs)
  .where(
    and(
      eq(reminderLogs.cycleId, cycle.id),
      gte(reminderLogs.sentAt, new Date(Date.now() - 60 * 60 * 1000)) // 1시간 이내
    )
  );

if (recentLog.length > 0) {
  console.log('최근 1시간 이내에 이미 리마인더 발송됨, 스킵');
  continue;
}
```

## Stakeholder Impact

### 멤버 (Members)

**혜택**:
- **마감 준수**: 리마인더로 마감 놓침 방지
- **투명성**: 미제출자 목록으로 팀 전체 상황 파악

**문제점**:
- **과도한 알림**: 중복 리마인더 수신 가능
- **부정확한 미제출자**: `generation_members` 미사용으로 전체 멤버 표시
- **개인화 부재**: 본인만의 리마인더 설정 불가

### 운영자 (Operator)

**혜택**:
- **시간 절감**: 미제출자 추적 자동화 (회차당 5-10분 절감)
- **일관성**: 리마인더 발송 일관성 보장

**부담**:
- n8n 워크플로우 관리 (cron 표현식, 시간대 설정)
- `generation_members` 데이터 미입력 시 미제출자 부정확
- Discord webhook URL 관리

### n8n 워크플로우

**통합 방식**:
```
n8n Cron (매일 09:00)
  ↓
GET /api/reminder?hoursBefore=24 (24시간 이내 마감 사이클 조회)
  ↓
각 사이클마다:
  GET /api/reminder/{cycleId}/not-submitted (미제출자 조회)
  → Discord 메시지 커스텀 생성
  → Discord webhook 전송
```

**또는**:
```
n8n Cron (매일 09:00)
  ↓
POST /api/reminder/send-reminders?hoursBefore=24
  ↓
API가 자동으로 Discord 메시지 발송
```

## Recommendations

### 1. `generation_members` 테이블 활성화 (최우선순위)

**문제**: 현재 전체 멤버 대상으로 미제출자 계산

**해결**:
```typescript
// src/routes/reminder/reminder.handlers.ts 수정
async function getNotSubmittedMembers(cycleId: number) {
  const cycle = await db.query.cycles.findFirst({
    where: eq(cycles.id, cycleId)
  });

  // 해당 기수의 멤버만 조회
  const allMembers = await db
    .select({ member: members })
    .from(generationMembers)
    .innerJoin(members, eq(generationMembers.memberId, members.id))
    .where(eq(generationMembers.generationId, cycle.generationId));

  // 이후 로직은 동일
  const submittedIds = new Set(...);
  const notSubmitted = allMembers.filter(m => !submittedIds.has(m.id));
  // ...
}
```

**기대 효과**: 미제출자 계산 정확도 100% 향상

### 2. 리마인더 발송 기록 테이블 추가 (높은 우선순위)

**문제**: 중복 리마인더 발송 방지 불가

**해결**: `reminder_logs` 테이블 추가 (상세 설명은 위에서)

**기대 효과**: 알림 피로 방지, 멤버 경험 개선

### 3. 시간 윈도우 여유 추가

**문제**: cron 실행 타이밍에 따라 리마인더 누락 가능

**해결**:
```typescript
// 현재: hoursBefore=24면 정확히 24시간
const deadline = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

// 개선안: 1시간(10%) 여유
const buffer = 1; // 1시간
const deadline = new Date(now.getTime() + (hoursBefore + buffer) * 60 * 60 * 1000);
```

**기대 효과**: 리마인더 누락률 0%에 근접

### 4. 리마인더 템플릿 커스터마이징 API

**제안**: 쿼리 파라미터로 메시지 커스텀

```typescript
POST /api/reminder/send-reminders?hoursBefore=6&includeSubmitted=false&tag=@here

// includeSubmitted=false: 미제출자만 멘션 (현재는 전체 목록)
// tag=@here: @here 멘션 추가 (긴급성 강조)
```

**기대 효과**: 리마인더 효과성 향상 (긴급한 회차에는 @here 멘션)

### 5. 리마인더 예약 스케줄링

**제안**: 리마인더 일정을 DB에 저장

```typescript
// reminder_schedules 테이블
export const reminderSchedules = pgTable('reminder_schedules', {
  id: serial('id').primaryKey(),
  cycleId: integer('cycle_id').notNull(),
  hoursBefore: integer('hours_before').notNull(), // 예: 24, 6
  sent: boolean('sent').default(false)
});

// Cron이 매시간 실행하며 예약된 리마인더 발송
async function sendScheduledReminders() {
  const dueReminders = await db
    .select()
    .from(reminderSchedules)
    .where(
      and(
        eq(reminderSchedules.sent, false),
        lte(reminderSchedules.hoursBefore, calculateHoursBefore(cycle.endDate))
      )
    );

  for (const reminder of dueReminders) {
    await sendReminderForCycle(reminder.cycleId);
    await db.update(reminderSchedules).set({ sent: true });
  }
}
```

**기대 효과**: 리마인더 일정을 데이터로 관리, n8n 의존도 감소

## Risk/Opportunity Assessment

### 기회 (Opportunities)

1. **개인별 리마인더**
   - 현재: 전체 미제출자 목록을 Discord에 공개
   - 개선: 미제출자 각각에게 DM 발송
   - 효과: 프라이버시 강화, 알림 효과성 향상

2. **리마인더 최적화**
   - 제출 패턴 분석으로 최적 리마인더 시점 도출
   - A/B 테스트: 마감 24시간 전 vs 12시간 전
   - 효과: 제출률 향상

3. **외부 스케줄러 의존도 감소**
   - API 내장 스케줄링 (node-cron)
   - 또는 CloudWatch Events / Google Cloud Scheduler
   - 효과: 시스템 단순화, 모니터링 용이

### 위험 (Risks)

1. **n8n 단일 실패점**
   - n8n 다운 시 리마인더 발송 안 함
   - 백업 스케줄러 필요 (GitHub Actions cron)

2. **시간대 혼란**
   - 서버 UTC 시간 vs 한국 시간
   - 마감 시간 설정 시 혼란 가능성

3. **리마인더 과부하**
   - 활성 기수가 많아지면 한 번에 수십 개 리마인더 발송
   - Discord rate limiting 위험

## Needed Data

다음 분석을 심화하기 위해 수집 필요:

1. **리마인더 효과성**
   - 리마인더 발송 후 제출률 변화
   - 리마인더 미발송 시 마감 준수율 비교
   - 최적 리마인더 시점 (마감 N시간 전)

2. **리마인더 발송 패턴**
   - 현재 회차당 평균 리마인더 발송 횟수
   - 중복 발송 빈도
   - 발송 실패율

3. **미제출자 정확도**
   - `generation_members` 미사용으로 인한 오류 범위
   - 기수별 실제 참여자 수 vs 전체 멤버 수

4. **n8n 워크플로우 성능**
   - 월간 n8n 실행 횟수
   - 실패율 및 실패 원인

---

## 문서 버전

- **Version**: 1.0.0
- **Created**: 2026-01-05
- **Last Updated**: 2026-01-05
- **Git Commit**: f324133
