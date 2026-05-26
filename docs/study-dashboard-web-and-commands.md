# 스터디봇 웹 대시보드 + 커맨드 제출/현황 초안

## 목표

스터디봇 slash command와 웹 대시보드를 연결해서 운영 중인 스터디 기수/회차 글 제출 현황을 누구나 확인할 수 있게 한다.

- Discord에서는 최소 입력으로 제출/조회한다.
- 웹에서는 운영 중인 기수와 회차, 제출 글, 참여 현황을 보기 좋게 확인한다.
- DB를 SSOT로 두고 Discord/GitHub/Web은 projection/input surface로 둔다.

## 핵심 사용자 흐름

### 1. 글 제출

Discord:

```txt
/submit url:https://blog.example.com/my-post
```

봇 응답:

- 제출 성공 여부
- 현재 회차 정보
- 웹 현황 링크
- `/cycle status` 다음 액션

기존 GitHub Issue 댓글 제출도 당분간 유지할 수 있다.

### 2. 현재 회차 확인

Discord:

```txt
/cycle current
/cycle status
```

봇 응답:

- 현재 스터디/기수/회차
- 기간과 마감일
- 제출률
- 내 제출 상태
- 전체 현황 웹 링크

### 3. 웹 현황 확인

URL 예시:

```txt
/studies/donguel-donguel/generations/2
/studies/donguel-donguel/generations/2/cycles/8
```

웹에서 보여줄 것:

- 운영 중인 기수 목록
- 기수별 회차 목록
- 회차별 제출 현황
- 제출한 글 카드 목록
- 미제출자 목록
- 마감까지 남은 시간

## 권장 웹 정보 구조

### 홈 / 스터디 목록

- 현재 운영 중인 스터디
- 활성 기수
- 현재 회차
- 제출률 요약

### 기수 상세

- 기수명: 예: `똥글똥글 3기`
- 상태: planned/active/completed
- 참가자 수
- 회차 리스트
- 전체 제출률

### 회차 상세

- 회차명: 예: `8회차`
- 기간
- 마감 상태
- 제출률: `12 / 15명`
- 제출자 목록
- 미제출자 목록
- 제출 글 목록

### 개인 상세 또는 필터

- 특정 멤버의 회차별 제출 이력
- GitHub/Discord 연결 상태
- 누락 회차

## API 초안

### Public read API

```http
GET /api/public/studies
GET /api/public/studies/:studySlug/generations
GET /api/public/studies/:studySlug/generations/active
GET /api/public/generations/:generationId/cycles
GET /api/public/cycles/:cycleId/status
GET /api/public/cycles/:cycleId/submissions
```

### Command/write API

```http
POST /api/submissions
```

Body:

```json
{
  "cycleId": 123,
  "discordUserId": "...",
  "url": "https://..."
}
```

서버는 Discord identity → Member → GenerationParticipant 승인 상태 → Current Cycle을 검증한 뒤 Submission을 만든다.

## Discord command 초안

### 참가자용

```txt
/submit url:<글 URL>
/me info
/cycle current
/cycle status
/generation list
/generation current
```

### 운영진용

```txt
/generation create 또는 별도 운영 스크립트
/cycle open
/cycle close
/cycle status
/missing-submissions
```

현재 프로덕션에는 generation/cycle 생성 slash command가 없으므로, 먼저 웹/스크립트/운영자 API 중 하나로 생성 경로를 마련해야 한다.

## 데이터 모델 원칙

- `Study` / `Generation` / `Cycle` / `Member` / `GenerationParticipant` / `Submission`을 중심으로 둔다.
- `GenerationParticipant`는 기수별 참여 상태를 가진다.
- 제출은 `one public URL = one Submission`으로 모델링한다.
- Discord ID는 제출 명령의 canonical identity로 사용한다.
- GitHub username은 GitHub Issue 댓글 ingestion과 기존 archive 연동용 identity로 유지한다.
- 회차 오픈 시점에 제출 의무자 snapshot을 남기면 이후 참가자 변경에도 과거 통계가 흔들리지 않는다.

## MVP 범위

1. 읽기 전용 웹 대시보드
   - active generation
   - cycles list
   - cycle status
   - submissions list
2. Discord 제출 명령 `/submit url:`
   - 현재 active cycle 자동 선택
   - 승인된 참가자만 제출 가능
   - 중복 URL/동일 회차 정책 정의
3. 웹 링크를 Discord 응답에 포함
4. 기존 GitHub Issue 댓글 제출은 병행 유지

## 구현 순서 제안

1. 현재 DB/API 스키마와 production 데이터 상태 확인
2. read model/API 설계와 테스트 작성
3. cycle status public API 구현
4. 웹 앱 추가 또는 기존 서버 static/frontend 구성 결정
5. Discord `/submit` 명령 RED test 작성
6. 제출 command/application handler 구현
7. 제출 성공/실패 UX 메시지 100% coverage
8. production command sync와 Render 배포 검증

## 공개 범위와 개인정보

웹이 누구나 보는 페이지라면 다음을 먼저 결정해야 한다.

- 미제출자 실명 공개 여부
- Discord display name 공개 여부
- GitHub username 공개 여부
- 제출 글 URL 공개 여부
- 검색엔진 index 허용 여부

권장 기본값:

- 스터디 내부 공유 링크면 이름/URL 공개 가능
- 완전 public이면 미제출자는 익명화하거나 로그인/토큰 보호 고려

## 남은 의사결정

- 웹은 완전 공개인가, 링크를 아는 사람만 보는가, Discord 로그인 필요한가?
- 기존 GitHub Issue 댓글 제출을 계속 1급 제출 경로로 둘 것인가?
- 한 회차에 여러 글 제출 허용 여부
- 제출 URL 수정/철회 정책
- 지각 제출 허용 여부
- 운영 중인 기수만 노출할지, 종료 기수 archive도 노출할지
