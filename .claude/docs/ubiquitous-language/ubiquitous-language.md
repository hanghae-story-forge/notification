# 유비쿼터스 언어 (Ubiquitous Language)

똥글똥글 프로젝트의 도메인 주도 설계(DDD) 기반 유비쿼터스 언어 정의입니다.

## 목차

1. [핵심 개념](#핵심-개념)
2. [도메인 모델](#도메인-모델)
3. [값 객체 (Value Objects)](#값-objects-value-objects)
4. [애그리거트 (Aggregates)](#애그리거트-aggregates)
5. [도메인 이벤트](#도메인-이벤트)
6. [용어 사전](#용어-사전)

---

## 핵심 개념

### 시스템 목적
2주마다 글을 쓰는 모임(스터디 그룹)의 자동화 시스템입니다. 회원은 GitHub Issue 댓글로 블로그 글을 제출하고, 시스템은 이를 기록하여 Discord로 알림을 보냅니다.

### 핵심 비즈니스 규칙
1. 각 **조직**은 여러 **기수**를 운영합니다
2. **기수**는 여러 **사이클**로 구성됩니다
3. **사이클**마다 회원들은 블로그 글을 **제출**해야 합니다
4. 제출은 GitHub Issue 댓글로 이루어집니다
5. Discord를 통해 알림이 발송됩니다

---

## 도메인 모델

### 1. 조직 (Organization)

스터디 그룹을 나타내는 최상위 개념입니다.

**속성**
- `name`: 조직 이름 (예: "똥글똥글")
- `slug`: URL 친화적 식별자 (예: "donguel-donguel")
- `discordWebhookUrl`: Discord 알림 발송용 웹훅 URL
- `isActive`: 활성화 상태

**비즈니스 로직**
- `activate()`: 조직 활성화
- `deactivate()`: 조직 비활성화
- `updateDiscordWebhookUrl()`: 웹훅 URL 변경

### 2. 회원 (Member)

시스템을 사용하는 개인을 나타냅니다.

**속성**
- `discordId`: Discord 사용자 ID (고유 식별자, 필수)
- `discordUsername`: Discord 사용자명 (변경 가능)
- `discordAvatar`: Discord 아바타 해시
- `githubUsername`: GitHub 사용자명 (선택, 중복 가능)
- `name`: 실제 이름

**비즈니스 로직**
- `matchesDiscordId()`: Discord ID로 회원 식별
- `hasGithubLinked()`: GitHub 연동 여부 확인
- `updateGithubUsername()`: GitHub 사용자명 변경
- `updateDiscordUsername()`: Discord 사용자명 변경

### 3. 기수 (Generation)

조직에서 운영하는 특정 기간의 그룹입니다.

**속성**
- `organizationId`: 소속 조직 ID
- `name`: 기수명 (예: "똥글똥글 1기")
- `startedAt`: 시작일
- `isActive`: 활성화 상태

**비즈니스 로직**
- `isCurrentGeneration()`: 현재 활성화된 기수인지 확인
- `hasPassedDays(days)`: 기수 시작 후 특정 일수가 지났는지 확인

### 4. 사이클 (Cycle)

기수 내의 주차별 활동 단위입니다.

**속성**
- `generationId`: 소속 기수 ID
- `week`: 주차 (1, 2, 3...)
- `startDate`: 시작일시
- `endDate`: 마감일시
- `githubIssueUrl`: 제출용 GitHub Issue URL

**비즈니스 로직**
- `getHoursRemaining()`: 마감까지 남은 시간 계산
- `isPast()`: 마감 지났는지 확인
- `isActive()`: 현재 진행 중인지 확인
- `belongsToGeneration()`: 특정 기수에 속하는지 확인

### 5. 제출 (Submission)

회원이 특정 사이클에 제출한 블로그 글입니다.

**속성**
- `cycleId`: 소속 사이클 ID
- `memberId`: 제출 회원 ID
- `url`: 블로그 글 URL
- `submittedAt`: 제출일시
- `githubCommentId`: GitHub 댓글 ID (중복 방지)

**비즈니스 로직**
- `isSubmittedBy(memberId)`: 특정 회원의 제출인지 확인
- `isForCycle(cycleId)`: 특정 사이클의 제출인지 확인

### 6. 조직 회원 (Organization Member)

조직에 소속된 회원의 역할과 상태를 관리합니다.

**속성**
- `organizationId`: 소속 조직 ID
- `memberId`: 회원 ID
- `role`: 역할 (OWNER, ADMIN, MEMBER)
- `status`: 상태 (PENDING, APPROVED, REJECTED, INACTIVE)
- `joinedAt`: 가입일시
- `updatedAt`: 업데이트일시

**비즈니스 로직**
- `approve()`: 멤버 승인 (PENDING → APPROVED)
- `reject()`: 멤버 거절 (PENDING → REJECTED)
- `deactivate()`: 멤버 비활성화 (APPROVED → INACTIVE)
- `changeRole(role)`: 역할 변경
- `isActiveMember()`: 활성 멤버인지 확인
- `hasAdminPrivileges()`: 관리자 권한이 있는지 확인

---

## 값 객체 (Value Objects)

### 사이클 관련

| 값 객체 | 설명 | 검증 규칙 |
|---------|------|-----------|
| `Week` | 주차 | 1 이상의 정수 |
| `DateRange` | 날짜 범위 | startDate < endDate |
| `GitHubIssueUrl` | GitHub Issue URL | 유효한 GitHub URL 형식 |

### 회원 관련

| 값 객체 | 설명 | 검증 규칙 |
|---------|------|-----------|
| `MemberName` | 회원 이름 | 비어있지 않은 문자열 |
| `GithubUsername` | GitHub 사용자명 | GitHub 사용자명 형식 |
| `DiscordId` | Discord ID | 비어있지 않은 문자열 (고유) |
| `DiscordUsername` | Discord 사용자명 | Discord 사용자명 형식 |

### 조직 관련

| 값 객체 | 설명 | 검증 규칙 |
|---------|------|-----------|
| `OrganizationName` | 조직명 | 비어있지 않은 문자열, 유일 |
| `OrganizationSlug` | 슬러그 | URL 친화적 문자열, 유일 |
| `DiscordWebhookUrl` | Discord 웹훅 URL | 유효한 Discord 웹훅 URL |

### 제출 관련

| 값 객체 | 설명 | 검증 규칙 |
|---------|------|-----------|
| `BlogUrl` | 블로그 URL | http/https 프로토콜 |
| `GithubCommentId` | GitHub 댓글 ID | 비어있지 않은 문자열 |

### 조직 회원 관련

| 값 객체 | 설명 | 검증 규칙 |
|---------|------|-----------|
| `OrganizationMemberStatusVO` | 조직원 상태 | PENDING, APPROVED, REJECTED, INACTIVE |
| `OrganizationRoleVO` | 조직원 역할 | OWNER, ADMIN, MEMBER |

---

## 애그리거트 (Aggregates)

### Organization 애그리거트
- **Aggregate Root**: `Organization`
- **관계**: Organization → Generation → Cycle

### Member 애그리거트
- **Aggregate Root**: `Member`
- **특징**: 조직에 속하지 않아도 존재 가능 (Discord 기반 인증)

### Generation 애그리거트
- **Aggregate Root**: `Generation`
- **관계**: Organization → Generation → Cycle

### Cycle 애그리거트
- **Aggregate Root**: `Cycle`
- **관계**: Cycle → Submission (일방향 참조)

### Submission 애그리거트
- **Aggregate Root**: `Submission`
- **특징**: 멤버와 사이클에 대한 참조만 보유

### OrganizationMember 애그리거트
- **Aggregate Root**: `OrganizationMember`
- **특징**: 조직과 회원 간의 다대다 관계 표현

---

## 도메인 이벤트

| 이벤트 | 발생 시점 | 설명 |
|--------|-----------|------|
| `OrganizationCreated` | 조직 생성 시 | 새 조직이 만들어짐 |
| `OrganizationActivated` | 조직 활성화 시 | 조직이 활성 상태로 변경 |
| `OrganizationDeactivated` | 조직 비활성화 시 | 조직이 비활성 상태로 변경 |
| `MemberRegistered` | 회원 가입 시 | 새 회원이 등록됨 |
| `CycleCreated` | 사이클 생성 시 | 새 사이클이 만들어짐 |
| `GenerationActivated` | 기수 생성 시 (활성) | 새 기수가 활성 상태로 생성 |
| `GenerationDeactivated` | 기수 비활성화 시 | 기수가 비활성 상태로 변경 |
| `SubmissionRecorded` | 제출 기록 시 | 새 제출이 기록됨 |
| `OrganizationMemberJoined` | 조직 가입 요청 시 | 조직 가입 신청 |
| `OrganizationMemberApproved` | 조직원 승인 시 | 가입 승인 완료 |
| `OrganizationMemberRejected` | 조직원 거절 시 | 가입 거절 |
| `OrganizationMemberDeactivated` | 조직원 비활성화 시 | 조직원 비활성/탈퇴 |

---

## 용어 사전

| 한글 용어 | 영문 용어 | 설명 | 사용 예시 |
|-----------|-----------|------|-----------|
| 조직 | Organization | 스터디 그룹 단위 | "똥글똥글 조직" |
| 슬러그 | Slug | URL 경로용 식별자 | "donguel-donguel" |
| 회원 | Member | 시스템 사용자 | "회원 가입" |
| 조직원 | Organization Member | 조직에 소속된 회원 | "조직원 승인" |
| 가입 대기 | PENDING | 조직 가입 승인 대기 상태 | "가입 대기중" |
| 승인됨 | APPROVED | 조직원 활성 상태 | "회원 승인됨" |
| 거절됨 | REJECTED | 조직 가입 거절 상태 | "가입 거절됨" |
| 비활성 | INACTIVE | 조직원 비활성/탈퇴 상태 | "회원 비활성화" |
| 오너 | OWNER | 조직 최고 권한자 | "조직 오너" |
| 관리자 | ADMIN | 조직 관리자 | "관리자 권한" |
| 일반 멤버 | MEMBER | 일반 조직원 | "일반 멤버" |
| 기수 | Generation | 기간별 그룹 | "똥글똥글 1기" |
| 사이클 | Cycle | 주차별 활동 단위 | "1주차 사이클" |
| 주차 | Week | 사이클의 순서 | "1주차" |
| 제출 | Submission | 블로그 글 제출 | "제출 완료" |
| 블로그 URL | BlogUrl | 제출된 블로그 글 주소 | "블로그 URL 검증" |
| 마감 | Deadline | 사이클 종료 시점 | "마감 임박" |
| 리마인더 | Reminder | 마감 알림 | "리마인더 발송" |
| 활성화 | Activate | 조직/기수 활성 상태 변경 | "조직 활성화" |
| 비활성화 | Deactivate | 조직/기수 비활성 상태 변경 | "조직 비활성화" |

---

## 명명 규칙 가이드

### 코드 내에서의 사용
1. **도메인 계층**: 영문 용어 사용 (예: `Cycle`, `Member`)
2. **API 응답**: 한글 설명 + 영문 키 (예: `{ week: 1, name: "1주차" }`)
3. **DB 컬럼**: snake_case 영문 (예: `github_issue_url`, `discord_webhook_url`)
4. **변수/함수**: camelCase 영문 (예: `getHoursRemaining()`, `isActive()`)

### 예시
```typescript
// 도메인 계층 - 영문
class Cycle {
  getHoursRemaining(): number { ... }
  isActive(): boolean { ... }
}

// API 응답 - 한글 설명 포함
{
  "week": 1,
  "cycleName": "똥글똥글 1기 - 1주차",
  "endDate": "2024-10-11T23:59:59.000Z"
}

// Discord 알림 - 한글 메시지
"📝 **똥글똥글 1기 - 1주차** 마감까지 3시간 남았습니다!"
```

---

## 참고

- DDD 전략적 패턴: Ubiquitous Language, Bounded Context
- 이 문서는 도메인 전문가와 개발자가 함께 사용하는 언어입니다
- 용어가 변경될 경우 코드, 문서, API 전반에서 일관되게 반영되어야 합니다
