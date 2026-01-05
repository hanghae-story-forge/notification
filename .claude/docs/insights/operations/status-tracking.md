# 상태 추적 시스템 분석

- **Scope**: 제출 현황 조회 API 및 Discord 봇 통합
- **Based on Facts**: [../../facts/routes/status.md](../../facts/routes/status.md)
- **Last Verified**: 2026-01-05

## Executive Summary

상태 추적 시스템은 **2가지 형식**(JSON, Discord webhook)으로 제출 현황을 제공하여, Discord 봇 명령어를 통한 실시간 조회를 가능하게 합니다. 조회 쿼리가 효율적이나, `generation_members` 미사용으로 전체 멤버를 대상으로 통계를 계산하여 기수별 참여율이 부정확할 수 있습니다.

## Facts

### API 엔드포인트 구조

1. **`GET /api/status/{cycleId}`**
   - **용도**: 특정 사이클의 제출 현황 조회 (JSON 형식)
   - **주 사용자**: Discord 봇, 대시보드
   - **응답 구조**: 사이클 정보, 요약 통계, 제출자 상세, 미제출자 목록

2. **`GET /api/status/{cycleId}/discord`**
   - **용도**: 제출 현황을 Discord webhook 페이로드 형식으로 반환
   - **주 사용자**: Discord 봇이 직접 Discord에 전송
   - **응답 구조**: Discord embeds 형식 (title, fields, color, timestamp)

### 통계 계산 로직

**요약 통계**:
```typescript
summary: {
  total: number,      // 전체 멤버 수 (members 테이블 전체)
  submitted: number,  // 제출자 수
  notSubmitted: number // 미제출자 수
}
```

**조회 순서**:
1. 사이클 조회 (`cycles` + `generations` JOIN)
2. 제출 목록 조회 (`submissions` + `members` JOIN)
3. 전체 멤버 조회 (`members` 테이블 전체)
4. 제출자/미제출자 분리

### Discord 포맷팅 특성

- **색상**: 파란색 (0x0099ff) - 정보성
- **이모지**: ✅ (제출), ❌ (미제출), ⏰ (마감 시간)
- **필드**: 3개 (제출, 미제출, 마감 시간)
- **타임스탬프**: `<t{unix}:R>` (상대적 시간: "2 hours ago", "in 3 days")
- **값 처리**: 빈 배열이면 "없음" 표시

## Key Insights (Interpretation)

### 1. 이중 포맷 지원: 유연성 vs 복잡성

**설계**: 동일한 데이터를 JSON과 Discord webhook 페이로드 두 가지 형식으로 제공

**JSON 형식** (`GET /api/status/{cycleId}`):
```json
{
  "cycle": { "id": 42, "week": 2, ... },
  "summary": { "total": 15, "submitted": 10, "notSubmitted": 5 },
  "submitted": [...],
  "notSubmitted": [...]
}
```

**Discord 형식** (`GET /api/status/{cycleId}/discord`):
```json
{
  "embeds": [{
    "title": "똥글똥글 1기 - 2주차 제출 현황",
    "color": 0x0099ff,
    "fields": [...]
  }]
}
```

**이점**:
- **유연성**: JSON은 웹 대시보드, Discord 포맷은 봇에 사용
- **관심사 분리**: Discord 포맷팅 로직이 API에 캡슐화
- **확장성**: 향후 Slack, Telegram 등 다른 포맷 추가 가능

**복잡성**:
- 두 엔드포인트 유지관리 부담
- 로직 중복 (데이터 조회는 동일, 포맷만 다름)

**개선안**: 단일 엔드포인트 + 쿼리 파라미터
```typescript
GET /api/status/{cycleId}?format=json|discord|slack
```

### 2. Discord 타임스탬프 마법: 현지화 자동화

**동적 타임스탬프**:
```typescript
value: `<t:${Math.floor(deadline.getTime() / 1000)}:R>`
// Discord 클라이언트에서 현지 시간으로 변환
// 한국: "3일 후", 미국: "in 3 days"
```

**Before (직접 포맷팅 시)**:
```typescript
// 서버에서 시간대 처리 직접 구현
const koreaTime = new Date(deadline).toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
// "1월 5일 오후 11:59"
```

**After (Discord 타임스탬프 사용 후)**:
```typescript
// Discord가 자동 처리
const timestamp = Math.floor(deadline.getTime() / 1000);
value: `<t:${timestamp}:R>` // "3일 후"
```

**이점**:
- **현지화 자동화**: 사용자마다 다른 시간대 자동 처리
- **상대적 시간**: "3일 후", "2시간 전" 등 직관적 표현
- **동적 업데이트**: 시간이 지남에 따라 Discord가 자동으로 업데이트

### 3. 전체 멤버 통계: 기수별 참여율 부정확

**문제점**: `members` 테이블 전체를 대상으로 통계 계산

**시나리오**:
```
members 테이블: 15명
- 1기 멤버: 10명 (이미 종료된 기수)
- 2기 멤버: 5명 (현재 활성 기수)

2기 1주차 사이클:
- 제출자: 3명 (모두 2기 멤버)
- 실제 제출률: 3/5 = 60%

현재 API 통계:
- total: 15명 (1기 + 2기)
- submitted: 3명
- notSubmitted: 12명
- 제출률: 3/15 = 20% (실제와 40%p 차이)
```

**영향**:
- **운영자 오도**: 1기 멤버가 미제출자로 표시되어 혼란
- **참여율 부정확**: 실제 기수 참여율과 차이
- **의사결정 왜곡**: "참여율이 낮다"는 잘못된 결론 도출 가능

**해결 방안** (리마인더 시스템과 동일):
```typescript
async function getStatus(cycleId: number) {
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

  return {
    summary: {
      total: allMembers.length,  // 기수 멤버 수만
      submitted: submittedIds.size,
      notSubmitted: notSubmitted.length
    }
  };
}
```

### 4. 빈 배열 처리: UX 세부 사항

**구현**:
```typescript
value: submitted.length > 0 ? submitted.join(', ') : '없음'
```

**이점**:
- Discord 메시지에서 빈 필드가 깨지는 것 방지
- "제출자: 없음"으로 명확한 표현
- 시각적 일관성 유지

**개선안**: 이모지와 결합하여 더 직관적으로
```typescript
value: submitted.length > 0
  ? `✅ ${submitted.join(', ')}`
  : '🚫 아직 없음';
```

### 5. 캐싱 부재: 반복 조회 시 비효율

**현재 구조**:
```
매번 DB 조회:
1. 사이클 조회 (cycles + generations JOIN)
2. 제출 목록 조회 (submissions + members JOIN)
3. 전체 멤버 조회 (members)
```

**시나리오**: Discord 채널에서 여러 명이 동시에 `/status 42` 실행
- 각 요청마다 동일한 DB 쿼리 실행
- 데이터베이스 부하 증가
- 응답 시간 지연

**해결 방안**: 캐싱 레이어 추가

```typescript
import { Redis } from 'ioredis';

const redis = new Redis();

async function getStatus(cycleId: number) {
  // 캐시 확인
  const cached = await redis.get(`status:${cycleId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // DB 조회
  const data = await fetchStatusFromDB(cycleId);

  // 캐싱 (5분)
  await redis.setex(`status:${cycleId}`, 300, JSON.stringify(data));

  return data;
}
```

**기대 효과**:
- DB 쿼리 90% 감소 (캐시 히트 시)
- 응답 시간 100ms → 10ms로 개선
- 데이터베이스 부하 감소

## Stakeholder Impact

### 멤버 (Members)

**혜택**:
- **투명성**: 제출 현황 실시간 확인 가능
- **사회적 압력**: 미제출자 목록 공개로 제출 동기 부여
- **편의성**: Discord 봇 명령어로 간단 조회

**우려**:
- **프라이버시**: 미제출자 공개로 부담감 느낄 수 있음
- **비교 심리**: 다른 멤버와 비교하여 스트레스 가능성

### 운영자 (Operator)

**혜택**:
- **시간 절감**: 제출 현황 수동 집계 불필요 (회차당 5-10분 절감)
- **투명성**: 팀 전체 상황 한눈에 파악
- **데이터 기반 의사결정**: 제출률 추이 모니터링

**부담**:
- Discord 봇 유지관리 (상태 조회 명령어)
- 캐시 무효화 전략 (제출 시 캐시 삭제 필요)

### Discord 봇 개발자

**통합 방식**:
```typescript
// Discord 봇 코드 (가상)
bot.on('message', async (msg) => {
  if (msg.content.startsWith('/status ')) {
    const cycleId = msg.content.split(' ')[1];

    // API 호출
    const response = await fetch(`https://api.dongueldonguel.com/api/status/${cycleId}/discord`);
    const discordPayload = await response.json();

    // Discord에 전송
    await msg.channel.send({ embeds: discordPayload.embeds });
  }
});
```

**이점**:
- API가 이미 Discord 포맷으로 반환하므로 봇 로직 간단
- 별도 포맷팅 불필요

## Recommendations

### 1. `generation_members` 테이블 활성화 (최우선순위)

**문제**: 전체 멤버 대상으로 통계 계산

**해결**: 리마인더 시스템과 동일하게 기수별 멤버 필터링

**기대 효과**: 기수별 참여율 정확도 100% 향상

### 2. 캐싱 레이어 추가 (높은 우선순위)

**문제**: 반복 조회 시 DB 부하

**해결**: Redis 또는 메모리 캐시 도입

**캐시 무효화 전략**:
```typescript
// 제출 시 캐시 무효화
async function handleIssueComment(c) {
  // ... 제출 저장

  // 캐시 삭제
  await redis.del(`status:${cycleId}`);

  return c.json({ message: "Submission recorded" });
}
```

**기대 효과**: DB 쿼리 90% 감소, 응답 시간 10배 개선

### 3. 페이징 지원 (대규모 멤버 시)

**제안**: 제출자/미제출자 목록에 페이징 추가

```typescript
GET /api/status/{cycleId}?page=1&limit=20

{
  "summary": { ... },
  "submitted": {
    "data": [...],
    "total": 50,
    "page": 1,
    "limit": 20
  },
  "notSubmitted": { ... }
}
```

**기대 효과**: 멤버 수가 100명 이상일 때 Discord 메시지 길이 제한(2000자) 회피

### 4. 제출 히스토리 조회

**제안**: 멤버별 제출 히스토리 조회 API

```typescript
GET /api/status/members/{memberId}?generationId=1

{
  "member": { "name": "홍길동" },
  "submissions": [
    { "week": 1, "url": "...", "submittedAt": "..." },
    { "week": 2, "url": "...", "submittedAt": "..." },
    { "week": 3, null } // 미제출
  ],
  "statistics": {
    "totalWeeks": 10,
    "submittedWeeks": 8,
    "submissionRate": 0.8
  }
}
```

**기대 효과**: 멤버 개인별 참여도 추적, 동기 부여 강화

### 5. 상태 구독 (웹훅)

**제안**: 제출 현황 변경 시 웹훅으로 알림

```typescript
POST /api/status/{cycleId}/subscribe
{
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "events": ["submission.created", "submission.removed"]
}

// 제출 시:
await sendWebhook(webhookUrl, {
  event: "submission.created",
  cycleId: 42,
  memberName: "홍길동",
  summary: {
    submitted: 11,
    notSubmitted: 4
  }
});
```

**기대 효과**: 폴링(polling) 대신 웹훅으로 실시간 업데이트, 불필요한 API 호출 감소

## Risk/Opportunity Assessment

### 기회 (Opportunities)

1. **데이터 시각화 대시보드**
   - 현재: JSON API만 제공
   - 개선: 웹 대시보드로 제출 현황 시각화
   - 효과: 운영자가 트렌드 직관적 파악

2. **제출률 예측**
   - 과거 제출 패턴 분석
   - 마감 전 제출률 예측 모델
   - 효과: 리마인더 타이밍 최적화

3. **Gamification**
   - 제출 스트릭 (연속 제출 횟수)
   - 뱃지 시스템 ("10회 연속 제출")
   - 효과: 참여 동기 부여 강화

### 위험 (Risks)

1. **프라이버시 우려**
   - 미제출자 공개로 멤버 간 압박 가능성
   - 개인별 제출 현황 조회 시 민감도 높음
   - 완화: 익명 옵션 또는 본인만 조회 가능

2. **Discord 메시지 길이 제한**
   - 멤버 수가 많으면(50명 이상) 메시지가 2000자 제한 초과
   - 완화: 페이징 또는 "외 30명" 축약 표시

3. **캐시 일관성**
   - 제출 후 캐시 삭제 실패 시 부정확한 데이터 반환
   - 완화: 캐시 TTL(5분)로 최신화 보장

## Needed Data

다음 분석을 심화하기 위해 수집 필요:

1. **상태 조회 패턴**
   - 일일 조회 횟수
   - 주로 조회되는 시간대
   - Discord 봇 사용 vs 직접 API 호출 비율

2. **제출률 트렌드**
   - 기수별 평균 제출률
   - 회차별 제출률 변화
   - 리마인더 후 제출률 상승 폭

3. **멤버 행동 패턴**
   - 마감 전 제출 vs 마감 후 제출 비율
   - 연속 미제출 후 이탈률
   - 제출 현황 조회 후 제출률 변화

4. **API 성능**
   - 평균 응답 시간
   - P95, P99 응답 시간
   - DB 쿼리 실행 시간

---

## 문서 버전

- **Version**: 1.0.0
- **Created**: 2026-01-05
- **Last Updated**: 2026-01-05
- **Git Commit**: f324133
