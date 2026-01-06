# Database Schema

- **Scope**: apps/server
- **Layer**: infrastructure
- **Source of Truth**: apps/server/src/infrastructure/persistence/drizzle-db/schema.ts
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM

## Entity Relationship Diagram

```
organizations (1)
  ├── generations (N)
  │     └── cycles (N)
  │           └── submissions (N)
  └── organization_members (N) ←→ members (N)
```

## Tables

### organizations

조직(스터디 그룹) 테이블. 멀티 테넌트 시스템의 핵심 단위.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | Auto-increment ID |
| name | text | UNIQUE, NOT NULL | 조직 이름 |
| slug | text | UNIQUE, NOT NULL, INDEXED | URL 식별자 |
| discord_webhook_url | text | NULLABLE | Discord 웹훅 URL |
| is_active | boolean | DEFAULT: true | 활성화 상태 |
| created_at | timestamp | DEFAULT: NOW() | 생성 일시 |

**Indexes**:
- `organizations_slug_idx` ON (slug)

### members

회원 테이블. Discord 기반 인증, 여러 조직에 속할 수 있음.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | Auto-increment ID |
| discord_id | text | UNIQUE, NOT NULL | Discord User ID (고유 식별자) |
| discord_username | text | NULLABLE | Discord 사용자명 (변경 가능) |
| discord_avatar | text | NULLABLE | Discord 아바타 해시 |
| github | text | NULLABLE | GitHub 사용자명 (더 이상 unique 아님) |
| name | text | NOT NULL | 회원 실명 |
| created_at | timestamp | DEFAULT: NOW() | 생성 일시 |

### generations

기수 테이블. 조직에 속함.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | Auto-increment ID |
| organization_id | integer | FK, NOT NULL, INDEXED | 조직 ID |
| name | text | NOT NULL | 기수명 (예: "똥글똥글 1기") |
| started_at | timestamp | NOT NULL | 시작일 |
| is_active | boolean | DEFAULT: true | 활성화 상태 |
| created_at | timestamp | DEFAULT: NOW() | 생성 일시 |

**Foreign Keys**:
- `organization_id` → `organizations(id)`

**Indexes**:
- `generations_org_idx` ON (organization_id)

### cycles

사이클(주차) 테이블. 기수에 속함.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | Auto-increment ID |
| generation_id | integer | FK, NOT NULL, INDEXED | 기수 ID |
| week | integer | NOT NULL | 주차 번호 (1, 2, 3...) |
| start_date | timestamp | NOT NULL | 시작일 |
| end_date | timestamp | NOT NULL | 종료일 |
| github_issue_url | text | NULLABLE | GitHub Issue URL |
| created_at | timestamp | DEFAULT: NOW() | 생성 일시 |

**Foreign Keys**:
- `generation_id` → `generations(id)`

**Indexes**:
- `cycles_generation_idx` ON (generation_id)

### organization_members

조직-회원 조인 테이블. 다대다 관계.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | Auto-increment ID |
| organization_id | integer | FK, NOT NULL | 조직 ID |
| member_id | integer | FK, NOT NULL | 회원 ID |
| role | enum | NOT NULL | 역할 (OWNER/ADMIN/MEMBER) |
| status | enum | NOT NULL, INDEXED | 상태 (PENDING/APPROVED/REJECTED/INACTIVE) |
| joined_at | timestamp | DEFAULT: NOW() | 가입 일시 |
| updated_at | timestamp | DEFAULT: NOW() | 상태 변경 일시 |

**Enums**:
- `organization_role`: OWNER, ADMIN, MEMBER
- `organization_member_status`: PENDING, APPROVED, REJECTED, INACTIVE

**Foreign Keys**:
- `organization_id` → `organizations(id)`
- `member_id` → `members(id)`

**Indexes**:
- `org_members_org_member_idx` ON (organization_id, member_id)
- `org_members_status_idx` ON (status)

### submissions

제출 테이블. 사이클과 회원에 속함.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PK | Auto-increment ID |
| cycle_id | integer | FK, NOT NULL | 사이클 ID |
| member_id | integer | FK, NOT NULL | 회원 ID |
| url | text | NOT NULL | 블로그 글 URL |
| submitted_at | timestamp | DEFAULT: NOW() | 제출 일시 |
| github_comment_id | text | UNIQUE, INDEXED | GitHub 댓글 ID (중복 방지) |

**Foreign Keys**:
- `cycle_id` → `cycles(id)`
- `member_id` → `members(id)`

**Indexes**:
- `submissions_cycle_member_idx` ON (cycle_id, member_id)
- `submissions_github_comment_idx` ON (github_comment_id)

### generation_members (Deprecated)

기수-회원 조인 테이블. organization_members로 대체됨.

**Status**: Deprecated (하위 호환용으로 유지)

## Key Design Decisions

1. **멀티 테넌트**: 모든 주요 엔티티(기수, 사이클)가 조직(organization)에 속함
2. **중간 테이블**: organization_members가 조직-회원 관계를 관리하며 역할과 상태를 저장
3. **GitHub Username 중복 허용**: 더 이상 unique 제약조건 없음 (여러 조직에서 같은 GitHub username 사용 가능)
4. **GitHub Comment ID 중복 방지**: submissions 테이블에서 UNIQUE 제약조건으로 중복 제출 방지
5. **활성화 상태 관리**: generations 테이블에서 is_active로 활성 기수 관리 (조직별 하나만 활성화 가능)
