# 조직 관리 기능 운영 분석

- **Scope**: apps/server
- **Based on Facts**: [.claude/docs/apps/server/facts/domain/organization.md](../../facts/domain/organization.md), [.claude/docs/apps/server/facts/domain/organization-member.md](../../facts/domain/organization-member.md), [.claude/docs/apps/server/facts/application/commands.md](../../facts/application/commands.md)
- **Last Verified**: 2025-01-07

## Executive Summary

멀티 테넌트 지원 추가로 단일 인스턴스에서 여러 글쓰기 모임을 독립적으로 운영할 수 있게 되었습니다. 이로 인해 운영자는 새로운 조직 생성 워크플로우를 학습해야 하며, 조직별 멤버 관리와 승인 프로세스가 도입되었습니다.

## Facts

### 아키텍처 변경사항

- **조직(Organization) 엔티티 추가**: L1-L188 (organization.domain.ts)
  - name, slug, discordWebhookUrl, isActive 속성
  - activate()/deactivate() 상태 전이 메서드
  - OrganizationCreated/Activated/Deactivated 도메인 이벤트 발행

- **조직원(OrganizationMember) 연결 엔티티 추가**: L88-L238 (organization-member.domain.ts)
  - organizationId, memberId, role, status 속성
  - PENDING → APPROVED/REJECTED 상태 전이
  - OWNER/ADMIN/MEMBER 역할 계층

### Command Handler 변경사항

- **CreateOrganizationCommand** (L30-L59)
  - Slug 중복 검사
  - 자동 slug 생성 (한글 → 영문 하이픈 변환)
  - Discord 웹훅 URL 검증

- **JoinOrganizationCommand** (L42-L106)
  - 조직 존재 확인
  - PENDING 상태로 조직원 생성
  - isNew 플래그로 신규/기존 멤버 구분

- **AddMemberToOrganizationCommand** (L42-L101)
  - 관리자가 멤버를 조직에 추가
  - 역할 지정 가능 (기본값: MEMBER)

- **RecordSubmissionCommand** (L47-L125)
  - 활성 멤버 확인 로직 추가 (L86-L95)
  - 조직별 Discord 알림 지원

### Database Schema 변경사항

- **organizations 테이블 추가**
  - id, name, slug (UNIQUE), discord_webhook_url, is_active
  - organizations_slug_idx 인덱스

- **organization_members 테이블 추가**
  - 조직-회원 다대다 관계
  - role, status enum
  - org_members_org_member_idx 복합 인덱스

- **generations 테이블 변경**
  - organization_id FK 추가
  - generations_org_idx 인덱스

- **members 테이블 변경**
  - github 컬럼 UNIQUE 제약조건 제거
  - 여러 조직에서 같은 GitHub username 사용 가능

## Key Insights (Interpretation)

### 1. 조직 생성 워크플로우 도입

**Before**: 단일 조직 가정으로 애플리케이션 구동

**After**: 조직 생성 → Discord 웹훅 설정 → 멤버 초대 → 승인 → 기수/사이클 생성

운영자는 새로운 조직을 생성할 때 다음을 고려해야 합니다:
- 조직 이름과 slug (URL 식별자)
- Discord 웹훅 URL (선택적이지만 권장)
- 초기 OWNER 지정

### 2. 멤버 관리 복잡도 증가

**Before**: 글로벌 멤버 목록 관리

**After**: 조직별 멤버 관리 + 승인 프로세스

멤버 관리 복잡도가 선형적으로 증가합니다:
- 단일 조직: O(1) 멤버 관리
- N개 조직: O(N) 멤버 관리 (조직별 독립적)

승인 프로세스(PENDING → APPROVED)가 추가됨에 따라 운영자 워크플로우에 승인 단계가 포함됩니다.

### 3. Discord 알림 격리

**Before**: 단일 Discord 채널에 모든 알림 전송

**After**: 조직별 Discord 웹훅 URL로 분리된 알림

이는 다음을 의미합니다:
- 조직 A의 제출 알림이 조직 B에 노출되지 않음
- 프라이버시 보장
- 운영자는 각 조직의 Discord 채널을 별도로 설정해야 함

### 4. GitHub Username 중복 허용에 따른 변경

**Before**: GitHub username이 UNIQUE 제약조건

**After**: UNIQUE 제약조건 제거

비즈니스 임팩트:
- 동일한 GitHub username을 가진 멤버가 여러 조직에 참여 가능
- RecordSubmissionCommand는 조직 활성 멤버 확인으로 제출 권한 검증

## Stakeholder Impact

### 운영자 (Operator)

- **학습 곡선**: 새로운 조직 생성, 멤버 관리 워크플로우 학습 필요
- **운영 오버헤드**: 조직별 Discord 웹훽 URL 설정 및 관리
- **멤버 승인**: PENDING 상태 멤버 승인 작업 추가

### 멤버 (Member)

- **가입 프로세스**: 조직 가입 요청 → 승인 대기 → 활성화
- **다중 조직 참여**: 여러 조직에 동시 참여 가능
- **알림 격리**: 자신이 속한 조직의 알림만 수신

### 개발자 (Developer)

- **API 변경**: 모든 Command에 organizationSlug 또는 organizationId 추가
- **테스트 복잡도**: 조직별 격리 테스트 필요
- **마이그레이션**: 기존 단일 테넌트 데이터를 멀티 테넌트로 변환

## Recommendations

### 1. 운영자 가이드 작성 (우선순위: 높음)

조직 생성 및 멤버 관리 운영 매뉴얼 작성:
- 조직 생성 절차
- 멤버 초대 및 승인 프로세스
- Discord 웹훅 URL 설정 방법

### 2. Admin Dashboard 개발 (우선순위: 높음)

GUI 기반 조직 관리 인터페이스:
- 조직 생성/수정/비활성화
- 멤버 목록 조회 및 승인
- 조직별 제출 현황 대시보드

### 3. Discord Bot 명령어 업데이트 (우선순위: 중간)

- `/join-org <slug>` - 조직 가입 요청
- `/approve-member <username>` - 멤버 승인 (관리자 전용)
- `/org-members` - 조직 멤버 목록

### 4. 모니터링 및 알림 (우선순위: 중간)

- PENDING 상태 멤버 알림
- 조직별 활동 메트릭 대시보드
- Discord 웹훅 실패 모니터링

## Risk/Opportunity Assessment

### 기회

- **확장성**: 단일 인스턴스로 무한한 조직 운영 가능
- **수익화**: 각 조직을 독립적인 서비스로 제공 가능
- **프라이버시**: 조직별 데이터 격리로 보안 강화

### 위험

- **운영 복잡도**: 조직 수가 증가함에 따라 운영 오버헤드 증가
- **성능 저하**: organization_members 테이블 크기 증가에 따른 쿼리 성능 우려
- **데이터 일관성**: 여러 조직에서 동일한 GitHub username 사용 시 혼동 가능

## Needed Data

### 1. 운영 효율성 측정

- 조직별 평균 멤버 수
- PENDING → APPROVED 전환 시간 (TTA - Time to Approve)
- 조직별 활성도 (제출률, 사이클 참여율)

### 2. 성능 메트릭

- organization_members 테이블 크기에 따른 쿼리 응답 시간
- 조직별 Discord 웹훅 응답 시간
- RecordSubmissionCommand 실행 시간 (조직 활성 멤버 확인 포함)

### 3. 사용자 행동

- 다중 조직 참여율
- 조직 간 이동 패턴
- Discord 알림 클릭률 (조직별)

## Quantitative Estimates

### 가정

- 평균 조직당 멤버 수: 20명
- 월간 신규 조직 생성: 2개
- PENDING 멤버 승인 시간: 24시간

### 운영 오버헤드 추정

- 단일 테넌트: 0분 (조직 관리 불필요)
- 멀티 테넌트 (5개 조직): 월 20분 (조직 생성 4분/조직 × 2 + 멤버 승인 2분/멤버 × 6)
- 멀티 테넌트 (10개 조직): 월 40분 (선형 증가)

### 리소스 사용량 추정

- Database 저장공간: organizations (1KB/조직), organization_members (100B/멤버)
- 10개 조직, 200명 멤버: ~20KB 추가 (무시할 수 있음)
- 100개 조직, 2,000명 멤버: ~200KB 추가 (여전히 무시할 수 있음)

### 주의사항

위 추정은 최소한의 가정에 기반하며 실제 운영 환경에서는 다를 수 있습니다:
- 멤버 승인 자동화로 TTA를 1시간 이내로 단축 가능
- Admin Dashboard 개발으로 운영 시간 50% 절감 가능
- 캐싱 전략으로 쿼리 성능 10배 개선 가능
