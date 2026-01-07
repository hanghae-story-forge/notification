# Application Layer Facts

- **Scope**: apps/server/src/application
- **Layer**: Application Layer (CQRS)
- **Source of Truth**: Commands, queries, event handlers
- **Last Verified**: 2026-01-07
- **Repo Ref**: 9164ce1

## Overview

The application layer implements CQRS (Command Query Responsibility Segregation) pattern:
- **Commands**: Write operations that change state
- **Queries**: Read operations that return data
- **Event Handlers**: React to domain events

Each command/query represents a **use case** and orchestrates domain objects to fulfill business requirements.

---

## Commands

Command objects encapsulate **write operations** and business use cases that modify system state.

### RecordSubmissionCommand

- **Location**: `apps/server/src/application/commands/record-submission.command.ts` (L47-124)
- **Purpose**: Records a blog post submission from GitHub Issue comment
- **Use Case**: Member submits blog post via GitHub comment

#### Request

```typescript
interface RecordSubmissionRequest {
  githubUsername: string;     // GitHub username of submitter
  blogUrl: string;            // Blog post URL
  githubCommentId: string;    // GitHub comment ID (deduplication)
  githubIssueUrl: string;     // GitHub Issue URL (identifies cycle)
}
```

#### Result

```typescript
interface RecordSubmissionResult {
  submission: Submission;
  memberName: string;
  cycleName: string;
  organizationSlug: string;
}
```

#### Responsibilities

1. Find Cycle by GitHub Issue URL
2. Find Generation by Cycle
3. Find Organization by Generation
4. Find Member by GitHub username
5. **Verify** Member is active in Organization
6. **Validate** no duplicate submission
7. Create Submission entity
8. Save Submission
9. Return result for Discord notification

#### Dependencies

- `CycleRepository`
- `MemberRepository`
- `SubmissionRepository`
- `OrganizationMemberRepository`
- `GenerationRepository`
- `SubmissionService`

#### Errors

- `NotFoundError`: Cycle, Generation, or Member not found
- `ForbiddenError`: Member is not active member of organization
- `ConflictError`: Duplicate submission (same comment ID)

---

### CreateCycleCommand

- **Location**: `apps/server/src/application/commands/create-cycle.command.ts` (L37-99)
- **Purpose**: Creates a new cycle from GitHub Issue creation
- **Use Case**: GitHub Issue created → Cycle created

#### Request

```typescript
interface CreateCycleRequest {
  organizationSlug: string;
  week: number;               // Week number (1, 2, 3...)
  startDate?: Date;           // Optional, defaults to now
  endDate?: Date;             // Optional, defaults to now + 7 days
  githubIssueUrl: string;
}
```

#### Result

```typescript
interface CreateCycleResult {
  cycle: Cycle;
  generationName: string;
}
```

#### Responsibilities

1. Find Organization by slug
2. Find active Generation for Organization
3. **Validate** no duplicate cycle for same week
4. Calculate default dates if not provided
5. Create Cycle entity
6. Save Cycle

#### Dependencies

- `CycleRepository`
- `GenerationRepository`
- `OrganizationRepository`

#### Errors

- `ConflictError`: Organization not found, no active generation, or duplicate week

#### Evidence

```typescript
// Extract: Date calculation logic
const now = new Date();
const startDate = request.startDate ?? now;
const endDate = request.endDate ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
```

---

### CreateMemberCommand

- **Location**: `apps/server/src/application/commands/create-member.command.ts` (L31-55)
- **Purpose**: Creates a new member
- **Use Case**: Onboarding new member

#### Request

```typescript
interface CreateMemberRequest {
  githubUsername: string;
  name: string;
  discordId?: string;         // Optional, defaults to `gh_${githubUsername}`
}
```

#### Result

```typescript
interface CreateMemberResult {
  member: Member;
}
```

#### Responsibilities

1. **Validate** no duplicate member (by GitHub username)
2. Create Member entity
3. Save Member

#### Dependencies

- `MemberRepository`
- `MemberService`

#### Errors

- `ConflictError`: Member already exists

---

### CreateGenerationCommand

- **Location**: `apps/server/src/application/commands/create-generation.command.ts`
- **Purpose**: Creates a new generation for an organization
- **Use Case**: Starting a new cohort/class period

#### Request

```typescript
interface CreateGenerationRequest {
  organizationSlug: string;
  name: string;               // e.g., "똥글똥글 1기"
  startedAt: Date;
}
```

#### Result

```typescript
interface CreateGenerationResult {
  generation: Generation;
}
```

#### Responsibilities

1. Find Organization by slug
2. Create Generation entity
3. Save Generation

#### Dependencies

- `GenerationRepository`
- `OrganizationRepository`

#### Errors

- `NotFoundError`: Organization not found

---

### CreateOrganizationCommand

- **Location**: `apps/server/src/application/commands/create-organization.command.ts`
- **Purpose**: Creates a new organization
- **Use Case**: Creating a new study group

#### Request

```typescript
interface CreateOrganizationRequest {
  name: string;
  slug?: string;              // Optional, auto-generated from name
  discordWebhookUrl?: string;
}
```

#### Result

```typescript
interface CreateOrganizationResult {
  organization: Organization;
}
```

#### Responsibilities

1. **Validate** unique slug
2. Create Organization entity
3. Save Organization

#### Dependencies

- `OrganizationRepository`

#### Errors

- `ConflictError`: Slug already exists

---

### JoinOrganizationCommand

- **Location**: `apps/server/src/application/commands/join-organization.command.ts`
- **Purpose**: Member joins an organization (pending approval)
- **Use Case**: Member requests to join organization

#### Request

```typescript
interface JoinOrganizationRequest {
  memberDiscordId: string;
  organizationSlug: string;
}
```

#### Result

```typescript
interface JoinOrganizationResult {
  organizationMember: OrganizationMember;
}
```

#### Responsibilities

1. Find Member by Discord ID
2. Find Organization by slug
3. **Validate** not already a member
4. Create OrganizationMember with PENDING status
5. Save OrganizationMember

#### Dependencies

- `MemberRepository`
- `OrganizationRepository`
- `OrganizationMemberRepository`

#### Errors

- `NotFoundError`: Member or Organization not found
- `ConflictError`: Already a member

---

### AddMemberToOrganizationCommand

- **Location**: `apps/server/src/application/commands/add-member-to-organization.command.ts`
- **Purpose**: Directly add member to organization (approved)
- **Use Case**: Admin adds member directly

#### Request

```typescript
interface AddMemberToOrganizationRequest {
  githubUsername: string;
  organizationSlug: string;
  role?: OrganizationRole;    // Optional, defaults to MEMBER
}
```

#### Result

```typescript
interface AddMemberToOrganizationResult {
  organizationMember: OrganizationMember;
}
```

#### Responsibilities

1. Find Member by GitHub username
2. Find Organization by slug
3. **Validate** not already a member
4. Create OrganizationMember with APPROVED status
5. Save OrganizationMember

#### Dependencies

- `MemberRepository`
- `OrganizationRepository`
- `OrganizationMemberRepository`

#### Errors

- `NotFoundError`: Member or Organization not found
- `ConflictError`: Already a member

---

### JoinGenerationCommand

- **Location**: `apps/server/src/application/commands/join-generation.command.ts`
- **Purpose**: Member joins a generation
- **Use Case**: Member enrolls in specific generation

#### Request

```typescript
interface JoinGenerationRequest {
  memberDiscordId: string;
  generationId: number;
}
```

#### Result

```typescript
interface JoinGenerationResult {
  generationMember: GenerationMember;
}
```

#### Responsibilities

1. Find Member by Discord ID
2. Find Generation by ID
3. **Validate** not already joined
4. Create GenerationMember
5. Save GenerationMember

#### Dependencies

- `MemberRepository`
- `GenerationRepository`
- `GenerationMemberRepository`

#### Errors

- `NotFoundError`: Member or Generation not found
- `ConflictError`: Already joined

---

### UpdateMemberStatusCommand

- **Location**: `apps/server/src/application/commands/update-member-status.command.ts`
- **Purpose**: Approve/reject/deactivate organization member
- **Use Case**: Admin manages membership requests

#### Request

```typescript
interface UpdateMemberStatusRequest {
  organizationSlug: string;
  memberDiscordId: string;
  action: 'approve' | 'reject' | 'deactivate';
}
```

#### Result

```typescript
interface UpdateMemberStatusResult {
  organizationMember: OrganizationMember;
}
```

#### Responsibilities

1. Find Organization by slug
2. Find Member by Discord ID
3. Find OrganizationMember
4. Execute action: `approve()`, `reject()`, or `deactivate()`
5. Save OrganizationMember

#### Dependencies

- `OrganizationRepository`
- `MemberRepository`
- `OrganizationMemberRepository`

#### Errors

- `NotFoundError`: Organization, Member, or OrganizationMember not found
- `ValidationError`: Invalid action for current status

---

## Queries

Query objects encapsulate **read operations** and return data without modifying state.

### GetCycleStatusQuery

- **Location**: `apps/server/src/application/queries/get-cycle-status.query.ts` (L74-285)
- **Purpose**: Retrieves submission status for a cycle
- **Use Case**: Display progress, send reminders

#### Methods

##### `getCurrentCycle(organizationSlug: string): Promise<CurrentCycleResult | null>`

Returns currently active cycle for an organization.

**Result**:
```typescript
interface CurrentCycleResult {
  id: number;
  week: number;
  generationName: string;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  daysLeft: number;
  hoursLeft: number;
  organizationSlug: string;
}
```

**Logic**:
1. Find Organization by slug
2. Find active Generation
3. Find active Cycle(s)
4. Calculate time remaining
5. Return result or null

##### `getCycleStatus(cycleId: number, organizationSlug: string): Promise<CycleStatusResult>`

Returns detailed submission status for a specific cycle.

**Result**:
```typescript
interface CycleStatusResult {
  cycle: {
    id: number;
    week: number;
    startDate: string;
    endDate: string;
    generationName: string;
    organizationSlug: string;
  };
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
  };
  submitted: SubmittedMember[];
  notSubmitted: NotSubmittedMember[];
}
```

**Logic**:
1. Find Organization
2. Find Cycle
3. Find Generation
4. **Verify** Cycle belongs to Organization
5. Get all Submissions for Cycle
6. Get active OrganizationMembers
7. Partition into submitted/not-submitted
8. Return result

##### `getCycleParticipantNames(cycleId: number, organizationSlug: string): Promise<...>`

Returns member names for Discord messages.

**Result**:
```typescript
{
  cycleName: string;
  submittedNames: string[];
  notSubmittedNames: string[];
  endDate: Date;
}
```

#### Dependencies

- `CycleRepository`
- `GenerationRepository`
- `OrganizationRepository`
- `SubmissionRepository`
- `OrganizationMemberRepository`
- `MemberRepository`

---

### GetReminderTargetsQuery

- **Location**: `apps/server/src/application/queries/get-reminder-targets.query.ts` (L51-149)
- **Purpose**: Retrieves cycles nearing deadline and members who haven't submitted
- **Use Case**: Automated reminder notifications

#### Methods

##### `getCyclesWithDeadlineIn(organizationSlug: string, hoursBefore: number): Promise<ReminderCycleInfo[]>`

Returns cycles with deadline within specified hours.

**Result**:
```typescript
interface ReminderCycleInfo {
  cycleId: number;
  cycleName: string;
  endDate: string;
  githubIssueUrl: string | null;
  organizationSlug: string;
}
```

**Logic**:
1. Find Organization by slug
2. Calculate time window: now → now + hoursBefore
3. Find cycles with deadline in window
4. Map to result DTO

##### `getNotSubmittedMembers(cycleId: number, organizationSlug: string): Promise<NotSubmittedResult>`

Returns active members who haven't submitted for a cycle.

**Result**:
```typescript
interface NotSubmittedResult {
  cycleId: number;
  week: number;
  endDate: string;
  notSubmitted: NotSubmittedMemberInfo[];
  submittedCount: number;
  totalMembers: number;
}

interface NotSubmittedMemberInfo {
  github: string;
  name: string;
  discordId: string | null;
}
```

**Logic**:
1. Find Organization
2. Find Cycle
3. Get all Submissions for Cycle
4. Get active OrganizationMembers
5. Filter members who haven't submitted
6. Return result

#### Dependencies

- `CycleRepository`
- `GenerationRepository`
- `OrganizationRepository`
- `SubmissionRepository`
- `OrganizationMemberRepository`
- `MemberRepository`

---

### GetCycleByIdQuery

- **Location**: `apps/server/src/application/queries/get-cycle-by-id.query.ts`
- **Purpose**: Retrieves a single cycle by ID

#### Request

```typescript
interface GetCycleByIdRequest {
  cycleId: number;
}
```

#### Result

```typescript
interface GetCycleByIdResult {
  cycle: Cycle;
  generation: Generation;
}
```

#### Dependencies

- `CycleRepository`
- `GenerationRepository`

---

### GetCyclesByGenerationQuery

- **Location**: `apps/server/src/application/queries/get-cycles-by-generation.query.ts`
- **Purpose**: Retrieves all cycles for a generation

#### Request

```typescript
interface GetCyclesByGenerationRequest {
  generationId: number;
}
```

#### Result

```typescript
interface GetCyclesByGenerationResult {
  cycles: Cycle[];
}
```

#### Dependencies

- `CycleRepository`

---

### GetGenerationByIdQuery

- **Location**: `apps/server/src/application/queries/get-generation-by-id.query.ts`
- **Purpose**: Retrieves a single generation by ID

#### Dependencies

- `GenerationRepository`

---

### GetAllGenerationsQuery

- **Location**: `apps/server/src/application/queries/get-all-generations.query.ts`
- **Purpose**: Retrieves all generations for an organization

#### Request

```typescript
interface GetAllGenerationsRequest {
  organizationSlug: string;
}
```

#### Dependencies

- `GenerationRepository`
- `OrganizationRepository`

---

### GetMemberByGithubQuery

- **Location**: `apps/server/src/application/queries/get-member-by-github.query.ts`
- **Purpose**: Retrieves member by GitHub username

#### Dependencies

- `MemberRepository`

---

### GetAllMembersQuery

- **Location**: `apps/server/src/application/queries/get-all-members.query.ts`
- **Purpose**: Retrieves all members

#### Dependencies

- `MemberRepository`

---

### GetOrganizationQuery

- **Location**: `apps/server/src/application/queries/get-organization.query.ts`
- **Purpose**: Retrieves organization by slug

#### Dependencies

- `OrganizationRepository`

---

### GetOrganizationMembersQuery

- **Location**: `apps/server/src/application/queries/get-organization-members.query.ts`
- **Purpose**: Retrieves active members of an organization

#### Dependencies

- `OrganizationMemberRepository`
- `MemberRepository`

---

### GetMemberOrganizationsQuery

- **Location**: `apps/server/src/application/queries/get-member-organizations.query.ts`
- **Purpose**: Retrieves organizations a member belongs to

#### Dependencies

- `OrganizationMemberRepository`
- `OrganizationRepository`

---

## Event Handlers

Event handlers react to domain events and trigger side effects (notifications, logging, etc.).

### SubmissionEventHandler

- **Location**: `apps/server/src/application/event-handlers/submission-event.handler.ts` (L12-32)
- **Purpose**: Sends Discord notification when submission is recorded

#### Methods

##### `handleSubmissionRecorded(event: SubmissionRecordedEvent, webhookUrl: string, memberName: string, cycleName: string, blogUrl: string): Promise<void>`

Handles `SubmissionRecordedEvent` and sends Discord webhook notification.

**Logic**:
1. Extract event data
2. Call Discord webhook client
3. Send formatted notification

#### Dependencies

- `IDiscordWebhookClient`

---

## Command/Query Index

### Commands Summary Table

| Command | Purpose | Input | Output | Changes State |
|---------|---------|-------|--------|---------------|
| `RecordSubmissionCommand` | Record blog submission | GitHub comment data | Submission result | Yes |
| `CreateCycleCommand` | Create cycle from issue | Issue data | Cycle | Yes |
| `CreateMemberCommand` | Create new member | Member data | Member | Yes |
| `CreateGenerationCommand` | Create generation | Generation data | Generation | Yes |
| `CreateOrganizationCommand` | Create organization | Organization data | Organization | Yes |
| `JoinOrganizationCommand` | Request to join org | Discord ID, org slug | OrgMember | Yes |
| `AddMemberToOrganizationCommand` | Add member directly | GitHub username, org slug | OrgMember | Yes |
| `JoinGenerationCommand` | Join generation | Discord ID, gen ID | GenMember | Yes |
| `UpdateMemberStatusCommand` | Approve/reject member | Action, IDs | OrgMember | Yes |

### Queries Summary Table

| Query | Purpose | Input | Output | Changes State |
|-------|---------|-------|--------|---------------|
| `GetCycleStatusQuery` | Get submission status | Cycle ID, org slug | Status result | No |
| `GetReminderTargetsQuery` | Get reminders | Org slug, hours | Cycles, members | No |
| `GetCycleByIdQuery` | Get cycle by ID | Cycle ID | Cycle + Generation | No |
| `GetCyclesByGenerationQuery` | Get all cycles | Generation ID | Cycle[] | No |
| `GetGenerationByIdQuery` | Get generation | Generation ID | Generation | No |
| `GetAllGenerationsQuery` | Get all generations | Org slug | Generation[] | No |
| `GetMemberByGithubQuery` | Get member by GitHub | GitHub username | Member | No |
| `GetAllMembersQuery` | Get all members | None | Member[] | No |
| `GetOrganizationQuery` | Get organization | Org slug | Organization | No |
| `GetOrganizationMembersQuery` | Get org members | Org slug | Member[] | No |
| `GetMemberOrganizationsQuery` | Get member orgs | Member ID | Organization[] | No |

---

## Dependency Injection Pattern

All commands and queries follow **constructor injection**:

```typescript
export class SomeCommand {
  constructor(
    private readonly repo1: Repository1,
    private readonly repo2: Repository2,
    private readonly service: DomainService
  ) {}

  async execute(request: Request): Promise<Result> {
    // Use dependencies
  }
}
```

**Benefits**:
- Testability (easy to mock dependencies)
- Clear dependencies
- Immutable state

---

## Error Handling Strategy

Commands/Queries throw domain errors:

- `NotFoundError`: Entity not found
- `ConflictError`: Duplicate or state conflict
- `ForbiddenError`: Access denied
- `ValidationError`: Invalid input

Presentation layer catches and maps to HTTP status codes.

---

## Evidence

```typescript
// Example: Command with multiple responsibilities
export class RecordSubmissionCommand {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly memberRepo: MemberRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly submissionService: SubmissionService
  ) {}

  async execute(request: RecordSubmissionRequest): Promise<RecordSubmissionResult> {
    // 1. Find Cycle by GitHub Issue URL
    const cycle = await this.cycleRepo.findByIssueUrl(request.githubIssueUrl);
    if (!cycle) {
      throw new NotFoundError('Cycle', `issueUrl=${request.githubIssueUrl}`);
    }

    // ... more steps ...

    // 9. Return result (handler sends Discord notification)
    return { submission, memberName, cycleName, organizationSlug };
  }
}
```

```typescript
// Example: Query with complex filtering
export class GetCycleStatusQuery {
  async getCycleStatus(cycleId: number, organizationSlug: string): Promise<CycleStatusResult> {
    // 1. Find Organization
    const organization = await this.organizationRepo.findBySlug(organizationSlug);

    // 2. Find Cycle
    const cycle = await this.cycleRepo.findById(CycleId.create(cycleId));

    // 3. Verify Cycle belongs to Organization
    if (generation.organizationId !== organization.id.value) {
      throw new NotFoundError('Cycle does not belong to organization');
    }

    // 4. Get submissions and members
    const submissions = await this.submissionRepo.findByCycleId(cycle.id);
    const orgMembers = await this.organizationMemberRepo.findActiveByOrganization(organization.id);

    // 5. Partition into submitted/not-submitted
    const submittedIds = new Set(submissions.map(s => s.memberId.value));
    // ... filtering logic ...

    return { cycle, summary, submitted, notSubmitted };
  }
}
```
