# 멀티 테넌트 아키텍처 영향 분석

- **Scope**: apps/server
- **Based on Facts**: [.claude/docs/apps/server/facts/domain/organization.md](../../facts/domain/organization.md), [.claude/docs/apps/server/facts/domain/organization-member.md](../../facts/domain/organization-member.md), [.claude/docs/apps/server/facts/database/schema.md](../../facts/database/schema.md)
- **Last Verified**: 2025-01-07

## Executive Summary

단일 테넌트에서 멀티 테넌트 아키텍처로 전환함으로써 시스템은 수직적 확장(Scale Up)에서 수평적 확장(Scale Out)이 가능해졌습니다. 조직별 데이터 격리, 독립적인 Discord 알림, 역할 기반 접근 제어가 도입되었습니다. 운영 비용 측면에서는 단일 인스턴스로 여러 조직을 운영할 수 있어 인프라 효율성이 개선되었습니다.

## Facts

### 아키텍처 변경사항

- **Organization Aggregate Root 추가**: 단일 테넌트 시스템의 핵심 단위
- **OrganizationMember 연결 엔티티**: 조직-회원 다대다 관계
- **RBAC (Role-Based Access Control)**: OWNER/ADMIN/MEMBER 역할 계층

### Database Schema 변경

- **organizations 테이블 추가**: 6개 컬럼, 1개 인덱스
- **organization_members 테이블 추가**: 8개 컬럼, 2개 인덱스
- **generations 테이블 변경**: organization_id FK 추가
- **members 테이블 변경**: github UNIQUE 제약조건 제거

### Domain Model 변경

- **Aggregate Root 경계 재정의**: Organization이 최상위 애그리거트
- **Value Object 추가**: OrganizationSlug, OrganizationName, DiscordWebhookUrl, OrganizationRoleVO, OrganizationMemberStatusVO
- **Domain Event 추가**: 6개 조직 관련 이벤트

## Key Insights (Interpretation)

### 1. 확장성 (Scalability) 개선

**Before (단일 테넌트)**:
- 최대 조직 수: 1개
- 최대 멤버 수: 데이터베이스 용량에 의해 제한
- 확장 방식: 단일 인스턴스 수직적 확장 (Scale Up)

**After (멀티 테넌트)**:
- 최대 조직 수: 이론적으로 무제한 (실제로는 DB connection pool에 의해 제한)
- 최대 멤버 수: 조직별로 데이터 격리로 독립적 확장 가능
- 확장 방식: 수평적 확장 (Scale Out) 가능

확장성 메트릭:
- 단일 테넌트: 1조직/인스턴스
- 멀티 테넌트: N조직/인스턴스 (N ≥ 1)

### 2. 운영 비용/리소스 효율성

**인프라 비용 절감**:
- 단일 테넌트: M개 조직 운영 = M개 인스턴스 필요
- 멀티 테넌트: M개 조직 운영 = 1개 인스턴스 가능

**가정**:
- 월간 인스턴스 비용: $20 (DigitalOcean Basic Droplet)
- 운영 조직 수: 10개

**비용 비교**:
- 단일 테넌트: 10 × $20 = $200/월
- 멀티 테넌트: 1 × $20 = $20/월
- 절감액: $180/월 (90% 절감)

### 3. 데이터 보안 및 프라이버시

**조직별 데이터 격리 (Data Isolation)**:
- organizations → generations → cycles → submissions 계층 구조
- organization_members를 통한 멤버 접근 제어
- 조직별 Discord 웹훅 URL 분리

**접근 제어 (Access Control)**:
- OWNER: 조직 전체 관리
- ADMIN: 멤버 관리
- MEMBER: 제출 및 조회

**프라이버시 보장**:
- 조직 A의 제출 현황이 조직 B에 노출되지 않음
- Discord 알림이 조직별로 분리되어 스팸 방지

### 4. 아키텍처 복잡도 증가

**Domain Layer 복잡도**:
- 신규 엔티티: 2개 (Organization, OrganizationMember)
- 신규 Value Object: 5개
- 신규 Repository: 2개
- 신규 Domain Event: 6개

**Application Layer 복잡도**:
- 신규 Command: 3개 (CreateOrganization, JoinOrganization, AddMemberToOrganization)
- 신규 Query: 3개 (GetOrganization, GetOrganizationMembers, GetMemberOrganizations)
- 기존 Command 수정: 4개 (CreateGeneration, CreateCycle, RecordSubmission 등)

**Infrastructure Layer 복잡도**:
- 신규 테이블: 2개
- 수정 테이블: 2개
- 신규 인덱스: 4개

## Stakeholder Impact

### 운영자 (Operator)

- **인프라 관리**: 단일 인스턴스로 여러 조직 운영 가능
- **비용 절감**: 월 $180 절감 (10개 조직 기준)
- **모니터링**: 조직별 리소스 사용량 모니터링 필요

### 개발자 (Developer)

- **개발 복잡도**: Domain Model 복잡도 증가 (2배 이상)
- **테스트 복잡도**: 조직별 격리 테스트 추가 필요
- **유지보수**: 코드 베이스 크기 증가 (약 30%)

### 멤버 (Member)

- **프라이버시**: 조직별 데이터 격리로 프라이버시 보장
- **다중 조직 참여**: 여러 조직에 동시 참여 가능
- **UX 개선**: 조직별 맞춤 알림

## Recommendations

### 1. 성능 최적화 (우선순위: 높음)

- **인덱싱 전략**: organization_members 테이블 쿼리 최적화
  - org_members_org_member_idx (organization_id, member_id)
  - org_members_status_idx (status)

- **캐싱 전략**: 조직별 활성 멤버 목록 캐싱
  - Redis에 조직별 활성 멤버 목록 캐싱
  - TTL: 5분

- **Connection Pooling**: DB connection pool 최적화
  - 최소 연결: 10
  - 최대 연결: 100 (조직 수 × 10)

### 2. 모니터링 및 알림 (우선순위: 중간)

- **조직별 메트릭**:
  - 활성 멤버 수
  - 제출률
  - Discord 웹훅 성공률

- **성능 모니터링**:
  - Query 응답 시간 (P95, P99)
  - API 레이턴시 (조직별)

- **알림**:
  - PENDING 멤버 알림
  - Discord 웹훅 실패 알림

### 3. 보안 강화 (우선순위: 중간)

- **RBAC 강화**:
  - Command Handler에서 역할 검증
  - Authorization Middleware 구현

- **감사 로그**:
  - 조직 생성/비활성화 기록
  - 멤버 승인/거절 기록
  - 역할 변경 기록

### 4. 문서화 (우선순위: 낮음)

- **아키텍처 가이드**:
  - 멀티 테넌트 패턴 설명
  - Domain Model 다이어그램

- **운영 가이드**:
  - 조직 생성 절차
  - 멤버 관리 가이드

## Risk/Opportunity Assessment

### 기회

- **수익화**: 각 조직을 독립적인 SaaS 서비스로 제공 가능
- **확장성**: 단일 인스턴스로 수백 개 조직 운영 가능
- **프라이버시**: 조직별 데이터 격리로 GDPR/CCPA 준수 용이

### 위험

- **성능 저하**: organization_members 테이블 크기 증가에 따른 쿼리 성능 우려
- **단일 장애점**: 단일 인스턴스 장애 시 모든 조직 영향
- **데이터 누출**: 버그로 인한 조직 간 데이터 누출 가능성

### 완화 전략

- **성능 저하**: 인덱싱, 캐싱, Connection Pooling
- **단일 장애점**: Database Replication, Read Replica
- **데이터 누출**: Row-Level Security (RLS), E2E 테스트 강화

## Needed Data

### 1. 성능 메트릭

- 조직별 Query 응답 시간 (P50, P95, P99)
- organization_members 테이블 크기에 따른 성능 저하
- Discord 웹훅 응답 시간

### 2. 운영 메트릭

- 월간 신규 조직 생성 수
- 조직별 평균 멤버 수
- 조직별 활성도 (제출률, 사이클 참여율)

### 3. 비용 메트릭

- 인프라 비용 (단일/멀티 테넌트 비교)
- 개발 비용 (초기 개발 + 유지보수)
- 운영 비용 (조직 관리 시간)

## Quantitative Estimates

### 가정

- 평균 조직당 멤버 수: 20명
- 월간 신규 조직 생성: 2개
- 평균 사이클당 제출 수: 15건
- Discord 웹훅 응답 시간: 200ms

### 리소스 사용량 추정

**Database Storage**:
- organizations: 1KB/조직
- organization_members: 100B/멤버
- 10개 조직, 200명 멤버: ~20KB
- 100개 조직, 2,000명 멤버: ~200KB

**Query Count**:
- 단일 테넌트: 10 queries/제출 (GitHub Webhook)
- 멀티 테넌트: 15 queries/제출 (조직 확인 +3 queries)
- 증가율: 50%

**Discord Webhook**:
- 단일 테넌트: 1 webhook/제출
- 멀티 테넌트: 1 webhook/제출 (조직별로 다른 URL)
- 변화 없음

### 개발 비용 추정

**초기 개발**:
- Domain Layer: 40시간
- Application Layer: 20시간
- Infrastructure Layer: 10시간
- Testing: 20시간
- **총계**: 90시간

**유지보수**:
- 월간 10시간 (버그 수정, 기능 추가)

### 주의사항

위 추정은 최소한의 가정에 기반하며 실제 운영 환경에서는 다를 수 있습니다:
- 캐싱 전략으로 Query 수 30% 감소 가능
- Admin Dashboard로 운영 시간 50% 절감 가능
- 자동화된 테스트로 개발 시간 20% 단축 가능
