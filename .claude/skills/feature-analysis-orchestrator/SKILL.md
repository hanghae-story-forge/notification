---
name: feature-analysis-orchestrator
description: Orchestrates multi-agent workflow to extract structured facts, insights, and specs from codebase. Use when analyzing features, documenting existing functionality, or creating comprehensive feature specifications.
---

# Feature Analysis Orchestrator

멀티 에이전트 워크플로우를 통해 코드베이스에서 구조화된 팩트, 인사이트, 스펙을 추출합니다.

## Quick Start

이 스킬은 다음과 같은 상황에서 사용합니다:

- 기능 분석 및 문서화 요청
- "기능 스펙 작성해줘"
- "코드베이스 분석해서 문서 만들어줘"
- "feature analysis" / "extract specs"
- 새로운 기능 구현 전 기존 코드베이스 이해

## Orchestrator Workflow

이 스킬은 다음 4가지 에이전트를 순차적으로 실행합니다:

```
1. codebase-extractor  → 2. business-context-analyst
                                      ↓
                              3. feature-spec-writer
                                      ↑
4. feature-orchestrator (coordination)
```

## Workflow Phases

### Phase 1: Codebase Extraction (@codebase-extractor)

**Goal**: 코드베이스에서 기술적 사실 추출

**Extracts**:
- 도메인 엔티티 및 값 객체
- Command/Query/Event Handler 구조
- API 엔드포인트 (HTTP, Discord, GraphQL)
- 데이터베이스 스키마
- 비즈니스 로직 위치

**Output Structure**: `.claude/docs/apps/server/facts/`
```
facts/
├── domain/           # 도메인 계층 (Member, Cycle, Submission...)
├── application/      # 애플리케이션 계층 (commands, queries, event-handlers)
├── infrastructure/   # 인프라 계층 (persistence, external)
├── presentation/     # 프레젠테이션 계층 (http, discord, graphql)
├── routes/          # 라우트별 분석
└── index.md         # 전체 팩트 요약
```

### Phase 2: Business Context Analysis (@business-context-analyst)

**Goal**: 기술적 사실을 비즈니스 맥락으로 해석

**Analyzes**:
- 사용자 시나리오 및 유스케이스
- 비즈니스 규칙 및 제약조건
- 데이터 흐름의 비즈니스 의미
- 도메인 용어 정의
- 운영 효율성 및 영향 분석

**Output Structure**: `.claude/docs/apps/server/insights/`
```
insights/
├── operations/       # 운영 분석 (github-webhook, discord-notifications...)
├── impact/          # 영향 분석 (member-experience, operational-efficiency...)
└── index.md         # 전체 인사이트 요약
```

### Phase 3: Feature Specification (@feature-spec-writer)

**Goal**: 종합적인 기능 명세서 작성

**Creates**:
- 기능 개요 및 비즈니스 가치
- 사용자 스토리 및 시나리오
- 기술 사양 (DDD 컨텍스트, API, 데이터 모델)
- 요구사항 (기능/비기능)

**Output Structure**: `.claude/docs/apps/server/specs/`
```
specs/
├── github-webhook.md
├── reminder-system.md
├── status-tracking.md
├── discord-notifications.md
├── ddd-architecture.md
├── domain-services.md
└── index.md
```

### Phase 4: Coordination (@feature-orchestrator)

**Goal**: 전체 워크플로우 조율 및 품질 관리

**Coordinates**:
- 에이전트 간 데이터 전달
- 출력물 검증
- 통합 결과 생성
- 인덱스 파일 업데이트

**Output**: 각 디렉토리의 `index.md` 업데이트

## Usage

### Command

```bash
# 전체 코드베이스 분석
/skill feature-analysis-orchestrator

# 특정 기능 분석
/skill feature-analysis-orchestrator "GitHub webhook submission flow"

# 특정 레이어만 분석
/skill feature-analysis-orchestrator "domain layer"
```

### Parameters

- `target` (optional): 분석 대상 (전체/특정 기능/특정 레이어)
- `depth` (optional): 분석 깊이 (quick/medium/thorough - default: medium)

## Output Structure

분석 완료 후 다음 구조로 파일들이 생성/업데이트됩니다:

```
.claude/docs/apps/server/
├── facts/                    # 기술적 사실 (codebase-extractor)
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   ├── routes/
│   └── index.md
├── insights/                 # 비즈니스 인사이트 (business-context-analyst)
│   ├── operations/
│   ├── impact/
│   └── index.md
└── specs/                    # 기능 명세서 (feature-spec-writer)
    ├── [feature-name].md
    └── index.md
```

## Agent Capabilities

### @codebase-extractor
- 코드베이스 구조 파악
- 패턴 매칭을 통한 핵심 파일 식별
- 기술적 데이터 추출

### @business-context-analyst
- 도메인 전문가 관점 분석
- 비즈니스 가치 도출
- 사용자 시나리오 정의

### @feature-spec-writer
- 기술 요구사항 + 비즈니스 맥락 통합
- 개발자가 바로 사용 가능한 명세서 작성
- 검증 가능한 요구사항 정의

### @feature-orchestrator
- 전체 워크플로우 관리
- 에이전트 간 통신 조율
- 품질 보증

## Example Workflows

### Example 1: Complete Codebase Analysis

```markdown
User: 전체 코드베이스 분석해서 문서화해줘

Orchestrator:
1. codebase-extractor 실행 → 전체 구조 추출
2. business-context-analyst 실행 → 비즈니스 맥락 분석
3. feature-spec-writer 실행 → 기능별 명세서 작성
4. 통합 요약 제공
```

### Example 2: Specific Feature Analysis

```markdown
User: GitHub 웹훅 제출 흐름 분석해줘

Orchestrator:
1. codebase-extractor(routes/github.ts, services/*) → 관련 코드 추출
2. business-context-analyst → 제출 프로세스 비즈니스 로직 분석
3. feature-spec-writer → 제출 기능 명세서 작성
4. 통합 결과 제공
```

## Best Practices

1. **명확한 분석 대상**: 전체 코드베이스인지 특정 기능인지 명시
2. **적절한 깊이 설정**: quick (빠른 탐색), medium (일반 분석), thorough (심층 분석)
3. **결과물 확인**: 각 에이전트 출력물을 확인하고 피드백
4. **반복 수행**: 새로운 기능 추가 시 재실행하여 문서 최신화

## Integration with Other Skills

- **planning-with-files**: 복잡한 기능 구현 전 분석 결과를 기반으로 계획 수립
- **ubiquitous-language-updater**: 도메인 용어 변경 시 유비쿼터스 언어 문서 업데이트
