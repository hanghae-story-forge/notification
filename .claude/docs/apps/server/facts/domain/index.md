# Domain Layer Facts

- **Scope**: apps/server/src/domain
- **Layer**: Domain Layer (DDD)
- **Source of Truth**: Domain entities, value objects, aggregates, domain services
- **Last Verified**: 2026-01-07
- **Repo Ref**: 9164ce1

## Overview

The domain layer implements Domain-Driven Design (DDD) patterns with clear separation of concerns:
- **Entities**: Aggregate roots with identity and lifecycle
- **Value Objects**: Immutable objects with no identity
- **Domain Events**: Events published by aggregates
- **Domain Services**: Business logic that doesn't fit in entities
- **Repositories**: Abstract data access interfaces

## Common Domain Types

### Base Classes (common/types.ts)

#### EntityId
- **Location**: `apps/server/src/domain/common/types.ts` (L4-31)
- **Purpose**: Base class for all entity IDs
- **Validation**: ID must be non-negative number
- **Methods**:
  - `isTemp()`: Returns true if ID is 0 (unsaved entity)
  - `equals(other)`: Type-safe equality check
  - `toString()`: String representation

#### DomainEvent
- **Location**: `apps/server/src/domain/common/types.ts` (L33-40)
- **Purpose**: Base class for domain events
- **Properties**:
  - `occurredAt`: Timestamp when event was created

#### AggregateRoot
- **Location**: `apps/server/src/domain/common/types.ts` (L42-59)
- **Purpose**: Base class for aggregate roots with domain events
- **Methods**:
  - `addDomainEvent(event)`: Add event to queue
  - `clearDomainEvents()`: Clear event queue
  - `domainEvents`: Getter for event queue (returns copy)

### Result Pattern
- **Location**: `apps/server/src/domain/common/types.ts` (L61-72)
- **Purpose**: Type-safe error handling
- **Type**: `Result<T, E>` - Either `{ success: true; value: T }` or `{ success: false; error: E }`
- **Factory**: `Result.ok(value)` and `Result.fail(error)`

### Pagination
- **Location**: `apps/server/src/domain/common/types.ts` (L74-86)
- **Interfaces**:
  - `Pagination`: `{ page: number; limit: number }`
  - `PaginatedResult<T>`: `{ items: T[]; total: number; page: number; limit: number; totalPages: number }`

---

## Member Domain

### Member Entity

- **Location**: `apps/server/src/domain/member/member.domain.ts` (L1-180)
- **Type**: Aggregate Root
- **Purpose**: Represents a member in the system (Discord-based identity)
- **Identity**: Discord ID (unique identifier)

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | MemberId | Unique identifier |
| `discordId` | DiscordId | Discord User ID (required, unique) |
| `discordUsername` | DiscordUsername \| null | Discord username (optional, mutable) |
| `discordAvatar` | string \| null | Discord avatar hash (optional) |
| `githubUsername` | GithubUsername \| null | GitHub username (optional, no longer unique) |
| `name` | MemberName | Display name (required) |
| `createdAt` | Date | Creation timestamp |

#### Factory Methods

- `Member.create(data: CreateMemberData): Member` (L57-86)
  - Creates new member or reconstitutes from DB
  - Validates all value objects
  - Publishes `MemberRegisteredEvent` if new member (id === 0)
  - **Validation**: Discord ID format, name length (1-50), GitHub username format

- `Member.reconstitute(data): Member` (L89-107)
  - Reconstructs member from database
  - Does NOT publish events

#### Business Logic

- `matchesDiscordId(discordId: string): boolean` (L135-137)
  - Checks if member matches Discord ID

- `hasGithubLinked(): boolean` (L140-142)
  - Returns true if GitHub username is set

- `updateGithubUsername(username: string): void` (L145-147)
  - Updates GitHub username with validation

- `updateDiscordUsername(username: string): void` (L150-152)
  - Updates Discord username with validation

- `updateDiscordAvatar(avatar: string): void` (L155-157)
  - Updates Discord avatar hash

#### Domain Events

- `MemberRegisteredEvent` (L19-29)
  - Published when new member is created
  - Contains: `memberId`, `discordId`

#### DTO

- `Member.toDTO(): MemberDTO` (L160-169)
  - Converts to plain object for external layers
  - Returns: `{ id, discordId, discordUsername?, discordAvatar?, githubUsername?, name }`

### Member Value Objects (member/member.vo.ts)

#### MemberName
- **Location**: `apps/server/src/domain/member/member.vo.ts` (L6-31)
- **Validation**:
  - Non-empty after trimming
  - Max 50 characters
- **Error**: `InvalidValueError` if validation fails

#### GithubUsername
- **Location**: `apps/server/src/domain/member/member.vo.ts` (L34-58)
- **Validation**:
  - GitHub username regex: `/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/`
  - Max 39 characters
- **Error**: `InvalidValueError` if invalid format

#### DiscordId
- **Location**: `apps/server/src/domain/member/member.vo.ts` (L61-95)
- **Validation**:
  - Discord snowflake ID: 17-19 digit number
  - Regex: `/^\d{17,19}$/`
- **Factory Methods**:
  - `DiscordId.create(value)` - Throws if invalid
  - `DiscordId.createOrNull(value)` - Returns null if invalid
- **Error**: `InvalidValueError` if invalid format

#### DiscordUsername
- **Location**: `apps/server/src/domain/member/member.vo.ts` (L98-134)
- **Validation**:
  - 2-32 characters
  - Alphanumeric and underscore only
  - Regex: `/^[a-zA-Z0-9_]{2,32}$/`
- **Factory Methods**:
  - `DiscordUsername.create(value)` - Throws if invalid
  - `DiscordUsername.createOrNull(value)` - Returns null if invalid
- **Error**: `InvalidValueError` if invalid format

### Member Repository Interface

- **Location**: `apps/server/src/domain/member/member.repository.ts`
- **Methods**:
  - `findById(id: MemberId): Promise<Member | null>`
  - `findByDiscordId(discordId: DiscordId): Promise<Member | null>`
  - `findByGithubUsername(username: string): Promise<Member | null>`
  - `findAll(): Promise<Member[]>`
  - `save(member: Member): Promise<void>`

### Member Domain Service

- **Location**: `apps/server/src/domain/member/member.service.ts`
- **Purpose**: Business logic that involves multiple Member entities or external concerns

---

## Cycle Domain

### Cycle Entity

- **Location**: `apps/server/src/domain/cycle/cycle.domain.ts` (L1-173)
- **Type**: Aggregate Root
- **Purpose**: Represents a weekly submission cycle within a generation
- **Identity**: Cycle ID

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | CycleId | Unique identifier |
| `generationId` | number | Foreign key to Generation |
| `week` | Week | Week number (1, 2, 3...) |
| `startDate` | Date | Cycle start date |
| `endDate` | Date | Cycle end date (deadline) |
| `githubIssueUrl` | GitHubIssueUrl \| null | GitHub Issue URL for submissions |
| `createdAt` | Date | Creation timestamp |

#### Factory Methods

- `Cycle.create(data: CreateCycleData): Cycle` (L54-78)
  - Creates new cycle or reconstitutes from DB
  - Validates week number and date range
  - Publishes `CycleCreatedEvent` if new cycle
  - **Validation**:
    - Week must be positive
    - Start date must be before end date

- `Cycle.reconstitute(data): Cycle` (L81-99)
  - Reconstructs cycle from database
  - Does NOT publish events

#### Business Logic

- `getHoursRemaining(): number` (L131-133)
  - Returns hours remaining until deadline
  - Delegates to `DateRange.getHoursRemaining()`

- `isPast(): boolean` (L136-138)
  - Returns true if deadline has passed
  - Delegates to `DateRange.isPast()`

- `isActive(): boolean` (L141-143)
  - Returns true if cycle is currently ongoing
  - Delegates to `DateRange.isActive()`

- `belongsToGeneration(generationId: number): boolean` (L146-148)
  - Checks if cycle belongs to specific generation

#### Domain Events

- `CycleCreatedEvent` (L16-27)
  - Published when new cycle is created
  - Contains: `cycleId`, `week`, `dateRange`

#### DTO

- `Cycle.toDTO(): CycleDTO` (L151-162)
  - Converts to plain object
  - Returns: `{ id, generationId, week, startDate, endDate, githubIssueUrl?, createdAt }`

### Cycle Value Objects

#### Week (cycle/vo/week.vo.ts)
- **Location**: `apps/server/src/domain/cycle/vo/week.vo.ts`
- **Validation**:
  - Must be positive integer (> 0)
- **Methods**:
  - `toNumber(): number` - Returns numeric value

#### DateRange (cycle/vo/date-range.vo.ts)
- **Location**: `apps/server/src/domain/cycle/vo/date-range.vo.ts`
- **Properties**: `startDate: Date`, `endDate: Date`
- **Validation**:
  - Start date must be before end date
- **Methods**:
  - `getHoursRemaining(): number` - Hours until end date
  - `isPast(): boolean` - True if end date is in the past
  - `isActive(): boolean` - True if current time is within range

#### GitHubIssueUrl (cycle/vo/github-issue-url.vo.ts)
- **Location**: `apps/server/src/domain/cycle/vo/github-issue-url.vo.ts` (L5-53)
- **Validation**:
  - Must be valid URL
  - Protocol must be https
  - Hostname must be github.com
  - Path must match `/issues/<digits>`
- **Factory Methods**:
  - `GitHubIssueUrl.create(url)` - Throws if invalid
  - `GitHubIssueUrl.createOrNull(url)` - Returns null if invalid
- **Error**: `InvalidGitHubIssueUrlError` if validation fails

### Cycle Repository Interface

- **Location**: `apps/server/src/domain/cycle/cycle.repository.ts`
- **Methods**:
  - `findById(id: CycleId): Promise<Cycle | null>`
  - `findByIssueUrl(url: string): Promise<Cycle | null>`
  - `findByGenerationId(generationId: number): Promise<Cycle[]>`
  - `findCyclesWithDeadlineInRangeByOrganization(organizationId: number, start: Date, end: Date): Promise<Cycle[]>`
  - `findActiveByGeneration(generationId: number): Promise<Cycle[]>`
  - `save(cycle: Cycle): Promise<void>`

---

## Generation Domain

### Generation Entity

- **Location**: `apps/server/src/domain/generation/generation.domain.ts` (L1-168)
- **Type**: Aggregate Root
- **Purpose**: Represents a cohort/class period (e.g., "똥글똥글 1기")
- **Identity**: Generation ID

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | GenerationId | Unique identifier |
| `organizationId` | number | Foreign key to Organization |
| `name` | string | Generation name (e.g., "똥글똥글 1기") |
| `startedAt` | Date | Generation start date |
| `isActive` | boolean | Active status |
| `createdAt` | Date | Creation timestamp |

#### Factory Methods

- `Generation.create(data: CreateGenerationData): Generation` (L63-94)
  - Creates new generation or reconstitutes from DB
  - **Validation**:
    - Name: non-empty, max 50 characters
  - Publishes `GenerationActivatedEvent` if new and active

- `Generation.reconstitute(data): Generation` (L97-113)
  - Reconstructs generation from database

#### Business Logic

- `isCurrentGeneration(): boolean` (L137-139)
  - Returns true if generation is active

- `hasPassedDays(days: number): boolean` (L142-147)
  - Returns true if specified days have passed since start

#### Domain Events

- `GenerationActivatedEvent` (L13-24)
  - Published when new active generation is created
- `GenerationDeactivatedEvent` (L26-37)
  - Published when generation is deactivated

#### DTO

- `Generation.toDTO(): GenerationDTO` (L150-158)
  - Returns: `{ id, organizationId, name, startedAt, isActive }`

### Generation Repository Interface

- **Location**: `apps/server/src/domain/generation/generation.repository.ts`
- **Methods**:
  - `findById(id: GenerationId): Promise<Generation | null>`
  - `findByOrganizationId(organizationId: number): Promise<Generation[]>`
  - `findActiveByOrganization(organizationId: number): Promise<Generation | null>`
  - `save(generation: Generation): Promise<void>`

### Generation Domain Service

- **Location**: `apps/server/src/domain/generation/generation.service.ts`
- **Purpose**: Multi-generation business logic

---

## Submission Domain

### Submission Entity

- **Location**: `apps/server/src/domain/submission/submission.domain.ts` (L1-167)
- **Type**: Aggregate Root
- **Purpose**: Records a member's blog post submission for a cycle
- **Identity**: Submission ID

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | SubmissionId | Unique identifier |
| `cycleId` | CycleId | Foreign key to Cycle |
| `memberId` | MemberId | Foreign key to Member |
| `url` | BlogUrl | Blog post URL |
| `submittedAt` | Date | Submission timestamp |
| `githubCommentId` | GithubCommentId | GitHub comment ID (deduplication) |

#### Factory Methods

- `Submission.create(data: CreateSubmissionData): Submission` (L66-90)
  - Creates new submission
  - Validates URL and GitHub comment ID
  - Publishes `SubmissionRecordedEvent`

- `Submission.reconstitute(data): Submission` (L93-112)
  - Reconstructs from database
  - Does NOT publish events

#### Business Logic

- `isSubmittedBy(memberId: MemberId): boolean` (L136-138)
  - Checks if submission belongs to member

- `isForCycle(cycleId: CycleId): boolean` (L141-143)
  - Checks if submission is for specific cycle

#### Domain Events

- `SubmissionRecordedEvent` (L28-40)
  - Published when submission is recorded
  - Contains: `submissionId`, `memberId`, `cycleId`, `url`

#### DTO

- `Submission.toDTO(): SubmissionDTO` (L146-156)
  - Returns: `{ id, cycleId, memberId, url, submittedAt, githubCommentId }`

### Submission Value Objects (submission/submission.vo.ts)

#### BlogUrl
- **Location**: `apps/server/src/domain/submission/submission.vo.ts`
- **Validation**:
  - Must be valid HTTP/HTTPS URL
- **Error**: `InvalidValueError` if invalid

#### GithubCommentId
- **Location**: `apps/server/src/domain/submission/submission.vo.ts`
- **Purpose**: Unique identifier for GitHub comment (deduplication)
- **Validation**: Non-empty string

### Submission Repository Interface

- **Location**: `apps/server/src/domain/submission/submission.repository.ts`
- **Methods**:
  - `findById(id: SubmissionId): Promise<Submission | null>`
  - `findByCycleId(cycleId: CycleId): Promise<Submission[]>`
  - `findByMemberId(memberId: MemberId): Promise<Submission[]>`
  - `findByCycleAndMember(cycleId: CycleId, memberId: MemberId): Promise<Submission | null>`
  - `findByGithubCommentId(commentId: string): Promise<Submission | null>`
  - `save(submission: Submission): Promise<void>`

### Submission Domain Service

- **Location**: `apps/server/src/domain/submission/submission.service.ts`
- **Purpose**: Submission validation and business rules
- **Methods**:
  - `validateSubmission(cycleId: CycleId, memberId: MemberId, githubCommentId: string): Promise<void>`
    - Checks if member already submitted
    - Checks if GitHub comment ID already exists
    - Throws `ConflictError` if duplicate

---

## Organization Domain

### Organization Entity

- **Location**: `apps/server/src/domain/organization/organization.domain.ts` (L1-188)
- **Type**: Aggregate Root
- **Purpose**: Represents a study group/organization
- **Identity**: Organization ID

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | OrganizationId | Unique identifier |
| `name` | OrganizationName | Organization display name |
| `slug` | OrganizationSlug | URL-friendly identifier |
| `discordWebhookUrl` | DiscordWebhookUrl | Discord webhook for notifications |
| `isActive` | boolean | Active status |
| `createdAt` | Date | Creation timestamp |

#### Factory Methods

- `Organization.create(data: CreateOrganizationData): Organization` (L73-102)
  - Creates new organization
  - Auto-generates slug from name if not provided
  - Publishes `OrganizationCreatedEvent` if new

- `Organization.reconstitute(data): Organization` (L105-121)
  - Reconstructs from database

#### Business Logic

- `activate(): void` (L145-151)
  - Activates organization
  - Publishes `OrganizationActivatedEvent`
  - No-op if already active

- `deactivate(): void` (L154-160)
  - Deactivates organization
  - Publishes `OrganizationDeactivatedEvent`
  - No-op if already inactive

- `updateDiscordWebhookUrl(url: string | null): void` (L163-165)
  - Updates Discord webhook URL

#### Domain Events

- `OrganizationCreatedEvent` (L18-29)
- `OrganizationActivatedEvent` (L31-38)
- `OrganizationDeactivatedEvent` (L40-47)

#### DTO

- `Organization.toDTO(): OrganizationDTO` (L168-178)
  - Returns: `{ id, name, slug, discordWebhookUrl?, isActive, createdAt }`

### Organization Value Objects (organization/organization.vo.ts)

#### OrganizationName
- **Location**: `apps/server/src/domain/organization/organization.vo.ts`
- **Validation**:
  - Non-empty after trimming
  - Max 100 characters

#### OrganizationSlug
- **Location**: `apps/server/src/domain/organization/organization.vo.ts`
- **Validation**:
  - URL-safe: lowercase alphanumeric, hyphens
  - Regex: `/^[a-z0-9-]+$/`
  - Min 2 characters, max 50

#### DiscordWebhookUrl
- **Location**: `apps/server/src/domain/organization/organization.vo.ts`
- **Validation**:
  - Must be valid URL or null
  - Must use https protocol
  - Hostname must be discord.com or discordapp.com

### Organization Repository Interface

- **Location**: `apps/server/src/domain/organization/organization.repository.ts`
- **Methods**:
  - `findById(id: OrganizationId): Promise<Organization | null>`
  - `findBySlug(slug: string): Promise<Organization | null>`
  - `findAll(): Promise<Organization[]>`
  - `save(organization: Organization): Promise<void>`

---

## OrganizationMember Domain

### OrganizationMember Entity

- **Location**: `apps/server/src/domain/organization-member/organization-member.domain.ts` (L1-238)
- **Type**: Entity (not Aggregate Root)
- **Purpose**: Represents membership relationship between Member and Organization
- **Identity**: OrganizationMember ID

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | OrganizationMemberId | Unique identifier |
| `organizationId` | OrganizationId | Foreign key to Organization |
| `memberId` | MemberId | Foreign key to Member |
| `role` | OrganizationRoleVO | Role in organization |
| `status` | OrganizationMemberStatusVO | Membership status |
| `joinedAt` | Date | Join timestamp |
| `updatedAt` | Date | Last update timestamp |

#### Enums

- **OrganizationRole**: `'OWNER' | 'ADMIN' | 'MEMBER'`
- **OrganizationMemberStatus**: `'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE'`

#### Factory Methods

- `OrganizationMember.create(data: CreateOrganizationMemberData): OrganizationMember` (L100-120)
  - Creates new organization membership
  - Default status: PENDING
  - Default role: MEMBER

- `OrganizationMember.reconstitute(data): OrganizationMember` (L123-141)
  - Reconstructs from database

#### Business Logic

- `approve(): void` (L173-179)
  - Approves pending member
  - Throws if not pending
  - Updates timestamp

- `reject(): void` (L182-188)
  - Rejects pending member
  - Throws if not pending
  - Updates timestamp

- `deactivate(): void` (L191-197)
  - Deactivates approved member
  - Throws if not approved
  - Updates timestamp

- `changeRole(newRole: string): void` (L200-203)
  - Changes member role
  - Updates timestamp

- `isActiveMember(): boolean` (L206-208)
  - Returns true if status is APPROVED

- `hasAdminPrivileges(): boolean` (L211-213)
  - Returns true if role is OWNER or ADMIN

#### Domain Events

- `OrganizationMemberJoinedEvent` (L24-35)
- `OrganizationMemberApprovedEvent` (L38-48)
- `OrganizationMemberRejectedEvent` (L50-61)
- `OrganizationMemberDeactivatedEvent` (L63-74)

#### DTO

- `OrganizationMember.toDTO(): OrganizationMemberDTO` (L216-226)
  - Returns: `{ id, organizationId, memberId, role, status, joinedAt, updatedAt }`

### OrganizationMember Value Objects (organization-member/organization-member.vo.ts)

#### OrganizationMemberStatusVO
- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Values**: PENDING, APPROVED, REJECTED, INACTIVE
- **Methods**:
  - `isPending(): boolean`
  - `isApproved(): boolean`
  - `isRejected(): boolean`
  - `isInactive(): boolean`
  - Static factories: `approved()`, `pending()`, `rejected()`, `inactive()`

#### OrganizationRoleVO
- **Location**: `apps/server/src/domain/organization-member/organization-member.vo.ts`
- **Values**: OWNER, ADMIN, MEMBER
- **Methods**:
  - `canManageMembers(): boolean` - Returns true for OWNER or ADMIN

### OrganizationMember Repository Interface

- **Location**: `apps/server/src/domain/organization-member/organization-member.repository.ts`
- **Methods**:
  - `findById(id: OrganizationMemberId): Promise<OrganizationMember | null>`
  - `findByOrganizationAndMember(organizationId: OrganizationId, memberId: MemberId): Promise<OrganizationMember | null>`
  - `findActiveByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]>`
  - `findPendingByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]>`
  - `isActiveMember(organizationId: OrganizationId, memberId: MemberId): Promise<boolean>`
  - `save(orgMember: OrganizationMember): Promise<void>`

---

## GenerationMember Domain

### GenerationMember Entity

- **Location**: `apps/server/src/domain/generation-member/generation-member.domain.ts`
- **Type**: Entity (deprecated)
- **Purpose**: Join table between Generation and Member
- **Status**: DEPRECATED - Replaced by OrganizationMember

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | GenerationMemberId | Unique identifier |
| `generationId` | GenerationId | Foreign key to Generation |
| `memberId` | MemberId | Foreign key to Member |
| `joinedAt` | Date | Join timestamp |

### GenerationMember Repository Interface

- **Location**: `apps/server/src/domain/generation-member/generation-member.repository.ts`
- **Status**: DEPRECATED
- **Methods**:
  - `findByGeneration(generationId: GenerationId): Promise<GenerationMember[]>`
  - `findByMember(memberId: MemberId): Promise<GenerationMember[]>`
  - `add(generationMember: GenerationMember): Promise<void>`

---

## Auth Domain

### JWT Value Object (auth/jwt.vo.ts)

#### JwtToken
- **Location**: `apps/server/src/domain/auth/jwt.vo.ts`
- **Purpose**: JWT token wrapper
- **Validation**:
  - Non-empty string
  - Format: `Bearer <token>` or raw token

#### JwtPayload
- **Location**: `apps/server/src/domain/auth/jwt.vo.ts`
- **Properties**:
  - `sub: string` - Subject (user ID)
  - `discordId: string` - Discord ID
  - `iat: number` - Issued at
  - `exp: number` - Expiration

### JWT Service Interface (auth/jwt.service.ts)

- **Location**: `apps/server/src/domain/auth/jwt.service.ts`
- **Purpose**: JWT token generation and validation
- **Methods**:
  - `generateToken(discordId: string, memberId: number): Promise<JwtToken>`
  - `verifyToken(token: string): Promise<JwtPayload>`

---

## Domain Errors

### Error Hierarchy (common/errors.ts)

- **Location**: `apps/server/src/domain/common/errors.ts`
- **Base Classes**:
  - `DomainError`: Base for all domain errors
  - `InvalidValueError`: Invalid value object value

### Specific Errors

- `NotFoundError`: Entity not found
  - Properties: `entityName: string`, `criteria: string`
- `ConflictError`: Duplicate or conflict
  - Properties: `message: string`
- `ForbiddenError`: Access denied
  - Properties: `message: string`
- `ValidationError`: Validation failed
  - Properties: `message: string`
- `InvalidGitHubIssueUrlError`: Invalid GitHub Issue URL
- `AuthenticationError`: Authentication failed
- `AuthorizationError`: Authorization failed

---

## Domain Services Summary

| Service | Location | Purpose |
|---------|----------|---------|
| `MemberService` | member/member.service.ts | Member-related business logic |
| `GenerationService` | generation/generation.service.ts | Generation lifecycle management |
| `SubmissionService` | submission/submission.service.ts | Submission validation and deduplication |
| `JwtService` | auth/jwt.service.ts | JWT token generation and verification |

---

## Repository Interfaces Summary

| Repository | Methods | Purpose |
|------------|---------|---------|
| `MemberRepository` | 5 methods | CRUD for Member entities |
| `CycleRepository` | 6 methods | CRUD for Cycle entities, query by date range |
| `GenerationRepository` | 4 methods | CRUD for Generation entities |
| `SubmissionRepository` | 6 methods | CRUD for Submission entities, duplicate detection |
| `OrganizationRepository` | 4 methods | CRUD for Organization entities |
| `OrganizationMemberRepository` | 6 methods | CRUD for OrganizationMember entities, status checks |
| `GenerationMemberRepository` | 3 methods | CRUD for GenerationMember entities (DEPRECATED) |

---

## Aggregates Summary

| Aggregate | Root Entity | Boundaries | Relationships |
|-----------|-------------|------------|---------------|
| Member | Member | Member ID | - No child entities - Referenced by OrganizationMember, Submission |
| Cycle | Cycle | Cycle ID | - No child entities - Belongs to Generation, has many Submissions |
| Generation | Generation | Generation ID | - No child entities - Belongs to Organization, has many Cycles |
| Submission | Submission | Submission ID | - No child entities - References Member, Cycle |
| Organization | Organization | Organization ID | - No child entities - Has many Generations, OrganizationMembers |
| OrganizationMember | OrganizationMember | OrganizationMember ID | - Not an aggregate root - References Organization, Member |
| GenerationMember | GenerationMember | GenerationMember ID | - DEPRECATED - References Generation, Member |

---

## Evidence

```typescript
// Example: Member entity with domain events
export class Member extends AggregateRoot<MemberId> {
  static create(data: CreateMemberData): Member {
    // ... validation ...
    const member = new Member(/* ... */);

    // Publish domain event if new member
    if (data.id === 0) {
      member.addDomainEvent(new MemberRegisteredEvent(id, discordId));
    }

    return member;
  }
}
```

```typescript
// Example: Value object with validation
export class DiscordId {
  private constructor(public readonly value: string) {
    const discordIdRegex = /^\d{17,19}$/;
    if (!discordIdRegex.test(value)) {
      throw new InvalidValueError('Discord ID', value, 'Invalid format');
    }
  }

  static create(value: string): DiscordId {
    return new DiscordId(value);
  }
}
```

```typescript
// Example: Repository interface
export interface MemberRepository {
  findById(id: MemberId): Promise<Member | null>;
  findByDiscordId(discordId: DiscordId): Promise<Member | null>;
  findByGithubUsername(username: string): Promise<Member | null>;
  findAll(): Promise<Member[]>;
  save(member: Member): Promise<void>;
}
```
