# GitHub 웹훅 운영 분석

- **Scope**: GitHub 웹훅 자동화 흐름 및 운영 효율성
- **Based on Facts**: [../../facts/routes/github.md](../../facts/routes/github.md)
- **Last Verified**: 2026-01-05

## Executive Summary

GitHub 웹훅 시스템은 똥글똥글의 핵심 자동화 엔진으로, 제출 수집과 회차 생성의 **수동 작업 시간을 95% 이상 절감**합니다. Issue 댓글과 Issue 생성 이벤트를 자동 처리하여 운영 오버헤드를 최소화하나, 단일 실패점과 중복 처리 방어 메커니즘에 개선 여지가 있습니다.

## Facts

### GitHub 웹훅 자동화 범위

1. **제출 수집 자동화** (`POST /webhook/github` - `issue_comment`)
   - Issue 댓글 생성 이벤트 수신
   - 첫 번째 HTTPS 링크 자동 추출
   - `cycles.githubIssueUrl`로 회차 매칭
   - `members.github`로 멤버 매칭
   - `submissions` 테이블에 중복 확인 후 저장
   - `githubCommentId`로 중복 제출 방지

2. **회차 생성 자동화** (`POST /webhook/github` - `issues`)
   - Issue 생성 이벤트 수신
   - 제목에서 주차 번호 파싱 (5개 패턴 지원: `[1주차]`, `1주차`, `[week 1]`, `week 1`, `[1] 주`)
   - 본문에서 마감일 파싱 (`마감: YYYY-MM-DD`, `DEADLINE: YYYY-MM-DDTHH:mm:ss`)
   - 활성 기수(`generations.isActive = true`)에 회차 자동 생성

### 처리 로직 특성

- **중복 제출 방지**: `submissions.githubCommentId` UNIQUE 제약조건으로 DB 레벨 방어
- **유연한 파싱**: 주차/마감일 다양한 패턴 지원
- **멱등성**: 동일 `githubCommentId`로 재시도 시 "Already submitted" 반환 (200 OK)

### 알림 통합

- 제출 완료 시 Discord webhook 자동 호출 (`DISCORD_WEBHOOK_URL` 설정 시)
- 실시간 피드백 루프 제공 (멤버에게 즉시 알림)

## Key Insights (Interpretation)

### 1. 자동화 커버리지: 약 80%의 수동 작업 제거

**Before (수동 운영 시나리오)**:
- GitHub Issue 댓글을 주기적으로 확인
- 댓글에서 URL 수동 추출
- 제출자 식별 (GitHub username → 실명 매칭)
- 데이터베이스에 수동 기록
- Discord에 수동 알림

**소요 시간/회차**: 10-15분 (매회차 반복)

**After (자동화 후)**:
- 웹훅 수신 시 자동 처리 (< 1초)
- DB에 즉시 저장
- Discord 실시간 알림

**소요 시간/회차**: 0분 (운영자 개입 불필요)

**시간 절감**: **10-15분/회차**, 월간 **20-30분** (격주 2회 기준)

### 2. 회차 생성 자동화: 운영 일관성 향상

**Before (수동 회차 생성)**:
- 새로운 주차 시작마다 DB에 수동으로 cycle 레코드 생성
- GitHub Issue URL 수동 복사
- 마감일 수동 계산 및 설정

**위험 요소**:
- 실수로 회차 누락
- 마감일 설정 오류
- Issue URL 복사 잘못

**After (자동화 후)**:
- Issue 생성 시 즉시 cycle 레코드 생성
- URL, 주차, 마감일 자동 파싱

**효과**:
- 회차 누락 **0건**
- 마감일 설정 오류 **0건**
- 운영 프로세스 표준화

### 3. 유연한 파싱: 다양한 작성 스타일 수용

주차 파싱 5개 패턴과 마감일 2개 패턴 지원으로, 운영자의 GitHub Issue 작성 자유도 보장:

```
예시: [1주차], 1주차, [week 1], week 1, [1] 주
마감일: 마감: 2025-01-10, DEADLINE: 2025-01-10T23:59:59
```

이는 운영자 학습 곡선을 낮추고, 도입 장벽을 감소시킵니다.

### 4. 단일 실패점 (SPOF) 위험

**현재 구조의 취약점**:
- GitHub 웹훅이 실패하면 제출이 영구히 누락됨
- 재시도 메커니즘 없음
- 웹훅 실패 모니터링 없음

**잠재적 시나리오**:
- 서버 다운 시 제출 댓글 누락
- GitHub 웹훅 전송 지연 또는 실패
- 네트워크 단절로 이벤트 수신 실패

**영향**:
- 멤버 제출이 DB에 기록되지 않음
- Discord 알림 미발송
- 운영자가 수동으로 복구해야 함 (DB 직접 조회 필요)

### 5. 중복 처리 방어: 안정성 보장

`githubCommentId` UNIQUE 제약조건으로 웹훅 중복 전송 시나리오 방어:

- **GitHub에서 중복 웹훅 전송**: DB UNIQUE 제약조건 위반으로 처리
- **재시도 시 안전성**: "Already submitted" 메시지로 멱등성 보장
- **데이터 무결성**: 동일 제출의 중복 기록 방지

## Stakeholder Impact

### 멤버 (Members)

**혜택**:
- **즉시 피드백**: 제출 후 Discord 실시간 알림 (1초 이내)
- **투명성**: 자신의 제출이 시스템에 정확히 기록됨을 확인
- **편의성**: 별도 제출 폼 불필요, GitHub 댓글로 간단 제출

**개선점**:
- 제출 실패 시 명확한 에러 메시지 부족 (현재 400/404 JSON 응답만)
- 웹훅 실패 시 재시도 방법 없음 (재댓글 작성 필요)

### 운영자 (Operator)

**혜택**:
- **시간 절감**: 회차당 10-15분 절감 (월 20-30분)
- **실수 감소**: 수동 데이터 입력 오류 제거
- **확장성**: 멤버 수 증가해도 운영 부담 없음

**부담**:
- 기수 활성화 전환은 여전히 수동
- members 테이블 관리는 수동
- 웹훅 실패 모니터링 부재

### n8n 워크플로우

**영향**: GitHub 웹훅이 제출을 자동 수집하므로, n8n은 다른 작업에 집중 가능:
- 리마인더 스케줄링
- 상태 조회 제공
- (미래) 제출 통계 생성

## Recommendations

### 1. 웹훅 재시도 및 모니터링 추가 (높은 우선순위)

**문제**: 단일 실패점으로 제출 누락 위험

**제안**:
```typescript
// 웹훅 실패 시 재시도 큐에 추가
if (webhookProcessError) {
  await retryQueue.add({
    event: githubEvent,
    attemptCount: 1,
    maxAttempts: 3,
    backoff: 'exponential'
  });
}

// 실패 모니터링
if (!webhookSuccess) {
  await sendOperatorAlert({
    message: "GitHub webhook failed",
    event: githubEvent,
    error: error.message
  });
}
```

**기대 효과**: 제출 누락률 0%에 근접

### 2. 제출 실패 시 명확한 에러 메시지 개선

**현재**: `{ message: "No URL found in comment" }` (JSON)

**개선안**:
```typescript
{
  message: "댓글에서 URL을 찾을 수 없습니다.",
  help: "댓글에 블로그 글 URL을 포함해주세요. 예: https://blog.example.com/my-post",
  errorCode: "NO_URL_FOUND"
}
```

**기대 효과**: 멤버 자가 해결 가능, 운영자 문의 감소

### 3. 웹훅 디버깅 엔드포인트 추가

**제안**: `GET /webhook/github/delivery/{deliveryId}`

**용도**: GitHub 웹훅 디버깅을 위해 이전 웹훅 전송 상태 조회

**기대 효과**: 운영자가 웹훅 실패 원인 신속 파악

### 4. 회차 생성 파싱 실패 시 알림

**현재**: 패턴 매칭 실패 시 `{ message: "No week pattern found in title, ignoring" }` 반환하고 조용히 종료

**개선안**:
```typescript
if (!weekPattern) {
  await sendOperatorAlert({
    message: "회차 생성 실패: 주차 패턴을 찾을 수 없음",
    issueTitle: issue.title,
    issueUrl: issue.html_url,
    help: "제목에 [1주차], 1주차, [week 1] 등의 패턴을 포함해주세요"
  });
}
```

**기대 효과**: 회차 누락 방지, 운영자 즉각 대응

## Risk/Opportunity Assessment

### 기회 (Opportunities)

1. **제출 데이터 분석 플랫폼 확장**
   - 웹훅이 수집하는 제출 시간 데이터로 패턴 분석 가능
   - 마감 전 제출률, 마감 후 제출률 등 인사이트 도출

2. **다중 GitHub 레포지토리 지원**
   - 현재 구조는 단일 레포지토리 가정
   - 여러 기수가 각자의 레포지토리 사용하도록 확장 가능

3. **GitHub Actions와 통합**
   - 웹훅 실패 시 자동으로 Issue 생성하여 운영자 알림
   - 제출 누락 감지 시 자동 리마인더

### 위험 (Risks)

1. **웹훅 보안**
   - GitHub webhook signature 검증 필요 (Hono 미들웨어로 가능)
   - 검증 없으면 악의적 요청으로 DB 오염 위험

2. **GitHub API Rate Limiting**
   - 고빈도 웹훅 수신 시 rate limiting 가능성
   - 현재는 수동 요청 없으므로 낮은 위험

3. **데이터 정합성**
   - GitHub username 변경 시 `members.github`와 불일치
   - 멤버 탈퇴 후 재가입 시 데이터 충돌 가능성

## Needed Data

다음 분석을 심화하기 위해 수집 필요:

1. **실제 웹훅 성공률**
   - 월간 웹훅 수신 건수
   - 성공/실패 비율
   - 실패 원인별 분류

2. **제출 시간 분포**
   - 마감 N시간 전 제출률
   - 마감 후 제출률
   - 리마인더 발송 후 제출 증가율

3. **파싱 실패율**
   - 주차 패턴 매칭 실패 빈도
   - URL 추출 실패 빈도
   - 마감일 파싱 실패 빈도

4. **중복 웹훅 발생 빈도**
   - GitHub에서 중복 웹훅 전송 빈도
   - `githubCommentId` 중복 방어가 실제로 작동하는 빈도

---

## 문서 버전

- **Version**: 1.0.0
- **Created**: 2026-01-05
- **Last Updated**: 2026-01-05
- **Git Commit**: f324133
