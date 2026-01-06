# Feature Analysis Orchestrator Reference

기술적 참고 문서입니다.

## Agent Implementation

Each agent is invoked using the Task tool with specific subagent_type:

### 1. @codebase-extractor

```typescript
Task({
  subagent_type: "codebase-extractor",
  prompt: `
    Analyze the codebase and extract technical facts.

    Target: ${target || "entire codebase"}
    Depth: ${depth || "medium"}
    Output Path: .claude/docs/apps/server/facts/

    Extract:
    1. Domain Layer (src/domain/)
       - Entities (Member, Generation, Cycle, Submission)
       - Value Objects (GithubUsername, BlogUrl, Week, etc.)
       - Domain Services
       - Repository interfaces

    2. Application Layer (src/application/)
       - Commands (RecordSubmission, CreateMember, CreateCycle, CreateGeneration)
       - Queries (GetCycleStatus, GetReminderTargets, GetAllMembers, etc.)
       - Event Handlers

    3. Infrastructure Layer (src/infrastructure/)
       - Persistence (DB schema, Repository implementations)
       - External services (Discord, GitHub)

    4. Presentation Layer (src/presentation/)
       - HTTP routes (GitHub webhook, Reminder, Status)
       - Discord bot
       - GraphQL API

    Output structure:
    .claude/docs/apps/server/facts/
    ├── domain/
    │   ├── member.md
    │   ├── generation.md
    │   ├── cycle.md
    │   └── submission.md
    ├── application/
    │   ├── commands.md
    │   ├── queries.md
    │   └── event-handlers.md
    ├── infrastructure/
    │   ├── persistence.md
    │   └── external.md
    ├── presentation/
    │   ├── http.md
    │   ├── discord.md
    │   └── graphql.md
    ├── routes/
    │   ├── github.md
    │   ├── reminder.md
    │   └── status.md
    └── index.md

    Each file should include:
    - YAML frontmatter with metadata (git_commit, created_at, etc.)
    - Technical facts only (no business interpretation)
    - Code references with file paths and line numbers
    - Type definitions and interfaces
  `
})
```

### 2. @business-context-analyst

```typescript
Task({
  subagent_type: "business-context-analyst",
  prompt: `
    Analyze the following technical facts and extract business insights.

    Facts: .claude/docs/apps/server/facts/
    Output Path: .claude/docs/apps/server/insights/

    Provide:
    1. Operations Analysis (insights/operations/)
       - How each feature works from business perspective
       - User scenarios and use cases
       - Business rules and constraints
       - ROI analysis (time saved, efficiency gained)

    2. Impact Analysis (insights/impact/)
       - Member experience impact
       - Operational efficiency impact
       - Cost/benefit analysis

    Output structure:
    .claude/docs/apps/server/insights/
    ├── operations/
    │   ├── github-webhook.md
    │   ├── discord-notifications.md
    │   ├── reminder-system.md
    │   ├── status-tracking.md
    │   ├── domain-model.md
    │   └── cqrs-pattern.md
    ├── impact/
    │   ├── member-experience.md
    │   └── operational-efficiency.md
    └── index.md

    Each file should include:
    - YAML frontmatter with based_on_facts reference
    - Executive Summary (2-3 sentences)
    - Business Value (before/after comparison)
    - User Scenarios (step by step flows)
    - Business Rules (explicit and implicit)
    - Opportunities & Risks
  `
})
```

### 3. @feature-spec-writer

```typescript
Task({
  subagent_type: "feature-spec-writer",
  prompt: `
    Create comprehensive feature specifications based on:

    Facts: .claude/docs/apps/server/facts/
    Insights: .claude/docs/apps/server/insights/
    Output Path: .claude/docs/apps/server/specs/

    For each feature, create a spec with:
    1. Overview & Business Value
    2. User Stories (As a... I want... So that...)
    3. Technical Specifications
       - DDD Context (Entities, Commands, Queries, Events)
       - API Specifications
       - Data Models
    4. Requirements (Functional & Non-functional)
    5. Edge Cases

    Output structure:
    .claude/docs/apps/server/specs/
    ├── github-webhook.md
    ├── reminder-system.md
    ├── status-tracking.md
    ├── discord-notifications.md
    ├── ddd-architecture.md
    ├── domain-services.md
    └── index.md

    Each file should include:
    - YAML frontmatter with based_on_facts and based_on_insights
    - Clear acceptance criteria for each user story
    - Implementable technical specifications
    - Testable requirements
  `
})
```

### 4. @feature-orchestrator

```typescript
// Main orchestrator logic
async function orchestrateAnalysis(target, depth) {
  const basePath = ".claude/docs/apps/server";

  // Phase 1: Extract facts
  const factsResult = await runCodebaseExtractor(target, depth, `${basePath}/facts`);

  // Phase 2: Analyze business context
  const insightsResult = await runBusinessContextAnalyst(factsResult, `${basePath}/insights`);

  // Phase 3: Write specifications
  const specResult = await runFeatureSpecWriter(factsResult, insightsResult, `${basePath}/specs`);

  // Phase 4: Update index files
  await updateIndexFiles({
    facts: factsResult,
    insights: insightsResult,
    specs: specResult
  }, basePath);

  return {
    facts: `${basePath}/facts`,
    insights: `${basePath}/insights`,
    specs: `${basePath}/specs`
  };
}

async function updateIndexFiles(results, basePath) {
  // Update facts/index.md
  await writeFactsIndex(results.facts, `${basePath}/facts/index.md`);

  // Update insights/index.md
  await writeInsightsIndex(results.insights, `${basePath}/insights/index.md`);

  // Update specs/index.md
  await writeSpecsIndex(results.specs, `${basePath}/specs/index.md`);
}
```

## Output File Templates

### facts/domain/[entity].md Template

```markdown
---
metadata:
  entity: [EntityName]
  aggregate_root: true/false
  value_objects: [VO1, VO2, ...]
  created_at: "2026-01-07T10:00:00Z"
  git_commit: "abc123"
  source_files:
    src/domain/[entity]/index.ts: "abc123"
    src/domain/[entity]/[entity].ts: "abc123"
---

# [EntityName] 도메인

## 개요
[엔티티에 대한 간단한 설명]

## 엔티티 구조
- `id`: UUID (PK)
- `field1`: Type
- `field2`: Type

## 값 객체
### [ValueObject1]
- 검증: [validation rules]
- 불변성: [immutability guarantees]

## 리포지토리 인터페이스
\`\`\`typescript
interface [Entity]Repository {
  findById(id: UUID): Promise<[Entity] | null>
  findAll(): Promise<[Entity][]>
  save(entity: [Entity]): Promise<void>
  delete(id: UUID): Promise<void>
}
\`\`\`

## 도메인 서비스
- `[Entity]Service.methodName()`: [description]

## 도메인 이벤트
- `[EventName]`: [description]

## 코드 참조
- 엔티티 정의: `src/domain/[entity]/[entity].ts:1`
- 값 객체: `src/domain/[entity]/vos/[vo].ts:1`
- 리포지토리 인터페이스: `src/domain/[entity]/repository.ts:1`
```

### facts/application/commands.md Template

```markdown
---
metadata:
  layer: application
  type: commands
  created_at: "2026-01-07T10:00:00Z"
  git_commit: "abc123"
---

# Commands (상태 변경 유스케이스)

## 개요
CQRS 패턴의 Command 부분. 시스템 상태를 변경하는 유스케이스들을 정의합니다.

## Command 목록

### [CommandName]

**목적**: [description]

**참조**: `src/application/commands/[command].ts:1`

**Input**:
\`\`\`typescript
interface [CommandName]Input {
  field1: Type;
  field2: Type;
}
\`\`\`

**Output**:
\`\`\`typescript
interface [CommandName]Output {
  result: Type;
}
\`\`\`

**구현**:
\`\`\`typescript
export class [CommandName]Command implements Command<Input, Output> {
  constructor(
    private repository: [Repository],
    private eventBus: EventBus
  ) {}

  async execute(input: Input): Promise<Output> {
    // 1. Validate input
    // 2. Load aggregate
    // 3. Execute business logic
    // 4. Save changes
    // 5. Publish events
  }
}
\`\`\`

**도메인 이벤트**:
- `[EventName]`: [description]

---

## Command 의존성 다이어그램
```
[Command1] → [Repository] → [Domain Entity]
                ↓
            [Event Bus] → [Event Handlers]
```
```

### insights/operations/[feature].md Template

```markdown
---
metadata:
  based_on_facts: "../facts/[relevant-fact].md"
  created_at: "2026-01-07T12:00:00Z"
  git_commit: "abc123"
---

# [Feature Name] 분석

## Executive Summary
[2-3문장으로 핵심 비즈니스 가치 설명]

## 비즈니스 가치

### Before (수동 운영)
- 작업 1: X분/회차
- 작업 2: Y분/회차
- **총 시간**: Z분/회차

### After (자동화 후)
- 작업 1: 0분 (자동화)
- 작업 2: 0분 (자동화)
- **총 시간**: 0분 (모니터링만)

### ROI
- 시간 절감: Z분/회차
- 월간 절감: A분 (격주 2회 기준)
- 연간 절감: B시간

## 사용자 시나리오

### 시나리오 1: [Scenario Name]
1. [사용자 행동]
2. [시스템 반응]
3. [결과]

## 비즈니스 규칙
1. **[Rule Name]**: [description]
2. **[Rule Name]**: [description]

## 기회 및 개선사항
1. **[Opportunity]**: [description]
2. **[Opportunity]**: [description]

## 위험
1. **[Risk]**: [description]
   - 완화: [mitigation strategy]
```

### specs/[feature].md Template

```markdown
---
metadata:
  based_on_facts: "../facts/[relevant-fact].md"
  based_on_insights: "../insights/operations/[relevant-insight].md"
  created_at: "2026-01-07T14:00:00Z"
  git_commit: "abc123"
---

# [Feature Name] 기능 명세서

## 개요
[기능에 대한 간단한 설명]

## 비즈니스 가치
- [가치 1]
- [가치 2]

## 사용자 스토리

### US-[N]: [User Story Title]
**As a** [user role],
**I want to** [action],
**So that** [benefit].

**Acceptance Criteria**:
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] [Criteria 3]

## 기술 사양

### DDD 컨텍스트
**Domain Layer**:
- `[Entity]` 엔티티
- `[ValueObject]` 값 객체

**Application Layer**:
- `[Command]` Command
- `[Query]` Query (if applicable)

**Domain Events**:
- `[Event]`: [description]

### API 명세
#### [METHOD] [path]

**Headers**:
- `Header-Name`: value

**Request Body**:
\`\`\`json
{
  "field": "value"
}
\`\`\`

**Response**:
- `200 OK`: [description]
- `400 Bad Request`: [description]

### 데이터 모델
#### [table_name]
\`\`\`sql
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY,
  field1 TYPE NOT NULL,
  field2 TYPE,
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## 요구사항

### 기능 요구사항
1. **FR-[N]**: [requirement description]
2. **FR-[N]**: [requirement description]

### 비기능 요구사항
1. **NFR-[N]**: [requirement description]
2. **NFR-[N]**: [requirement description]

## Edge Cases
1. **[Case name]**: [handling approach]
2. **[Case name]**: [handling approach]
```

## Error Handling

Each agent should handle these error scenarios:

### codebase-extractor
- No matching patterns found → Return empty with note
- File read errors → Log and continue
- Timeout → Return partial results

### business-context-analyst
- Insufficient context → Request clarification
- Ambiguous business logic → Document assumptions
- No clear domain model → Flag for review

### feature-spec-writer
- Conflicting requirements → Flag conflicts
- Missing information → Mark as TBD
- Incomplete specs → Indicate completion status

### feature-orchestrator
- Agent failure → Continue with available data, log error
- Timeout → Return partial results
- Validation failure → Request user review

## Quality Checks

### Before Output
1. **Completeness**: All required sections present
2. **Consistency**: No contradictory information
3. **Clarity**: Technical and non-technical audiences understood
4. **Actionability**: Specs are implementable

### Validation Criteria
- All extracted facts have sources (file:line)
- Business insights link to technical facts
- Feature specs have testable requirements
- Index files accurately represent subdirectories

## Performance Considerations

### Execution Time by Depth
- **quick**: ~30 seconds
  - Index files only
  - No detailed analysis
  - Top-level overview

- **medium**: ~2 minutes
  - Full file reads
  - Cross-reference analysis
  - Standard depth

- **thorough**: ~5-10 minutes
  - All files including tests
  - Deep pattern analysis
  - Edge case exploration

### Optimization
- Run agents sequentially (dependencies exist)
- Cache results for repeated analysis
- Incremental updates for small changes (git diff)
- Use depth parameter to control scope

## Integration Points

### With planning-with-files
```markdown
# Use analysis output for planning

Task: Implement new feature

1. Run feature-analysis-orchestrator
2. Read facts/[domain]/[entity].md to understand domain
3. Read specs/[related-feature].md for context
4. Create task_plan.md with analysis as reference
```

### With ubiquitous-language-updater
```markdown
# Keep domain language in sync

After domain changes:
1. Update code (new entities, value objects)
2. Run ubiquitous-language-updater
3. Re-run feature-analysis-orchestrator to verify consistency
4. Check that facts/ reflects new domain language
```

## Debugging

### Enable Debug Mode
```bash
# Add to skill invocation
/skill feature-analysis-orchestrator debug=true
```

### Debug Output Includes
- Agent invocation details
- Intermediate results
- Timing information
- Error stack traces
- File paths being processed

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty facts directory | No patterns matched | Check glob patterns, verify file structure |
| Generic insights | Insufficient domain context | Provide domain context, adjust depth |
| Incomplete specs | Missing requirements | Review gaps, provide additional context |
| Slow execution | Large codebase + thorough mode | Use medium depth, target specific areas |
| Missing index.md | Orchestrator failed | Re-run with debug=true |
| Inconsistent metadata | Files created manually | Ensure YAML frontmatter is valid |
