# GraphQL API Operations Analysis

---
metadata:
  version: "1.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  based_on_facts:
    - ".claude/docs/apps/server/facts/presentation/graphql.md"
    - ".claude/docs/apps/server/facts/application/queries.md"
    - ".claude/docs/apps/server/facts/application/commands.md"
  git_commit: "cdbdf2d"
---

## Executive Summary

The GraphQL API provides a **flexible, type-safe query interface** for data retrieval and mutations, enabling clients to request exactly the data they need. Built with Pylon framework using a code-first approach, it offers strongly-typed queries and mutations that integrate seamlessly with the CQRS architecture. However, limited mutation coverage and missing authorization layers present improvement opportunities.

## Facts

### GraphQL Service Architecture

- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts`
- **Framework**: Pylon (Code-First GraphQL)
- **Approach**: TypeScript classes define schema automatically
- **Endpoint**: `/graphql`
- **Introspection**: Enabled (development-friendly)

### Available Queries

1. **`members`** - Retrieve all members
   - Returns: `GqlMember[]`
   - Handler: `GetAllMembersQuery`

2. **`member(github: string)`** - Find member by GitHub username
   - Returns: `GqlMember | null`
   - Handler: `GetMemberByGithubQuery`

3. **`generations`** - List all generations
   - Returns: `GqlGeneration[]`
   - Handler: `GetAllGenerationsQuery`

4. **`generation(id: number)`** - Get generation by ID
   - Returns: `GqlGeneration | null`
   - Handler: `GetGenerationByIdQuery`

5. **`activeGeneration`** - Get currently active generation
   - Returns: `GqlGeneration | null`
   - Handler: Repository direct query

6. **`cycles(generationId?: number)`** - List cycles (optionally filtered by generation)
   - Returns: `GqlCycle[]`
   - Handler: `GetCyclesByGenerationQuery`

7. **`cycle(id: number)`** - Get cycle by ID
   - Returns: `GqlCycle | null`
   - Handler: `GetCycleByIdQuery`

8. **`activeCycle`** - Get current active cycle (hardcoded to 'dongueldonguel')
   - Returns: `GqlCycle | null`
   - Handler: `GetCycleStatusQuery.getCurrentCycle()`

9. **`cycleStatus(cycleId: number, organizationSlug: string)`** - Get detailed cycle status
   - Returns: `GqlCycleStatus` (includes submitted/not submitted members)
   - Handler: `GetCycleStatusQuery.getCycleStatus()`

### Available Mutations

1. **`addMember(github: string, name: string, discordId?: string)`**
   - Returns: `GqlMember`
   - Handler: `CreateMemberCommand`

2. **`addGeneration(name: string, startedAt: string, organizationSlug: string)`**
   - Returns: `GqlGeneration`
   - Handler: `CreateGenerationCommand`

3. **`addCycle(generationId: number, week: number, startDate: string, endDate: string, githubIssueUrl: string, organizationSlug: string)`**
   - Returns: `GqlCycle`
   - Handler: `CreateCycleCommand`

4. **`addSubmission`**
   - Status: **Not Implemented**
   - Returns: Error message directing to GitHub webhook
   - Reason: Requires GitHub username and Issue URL context

### GraphQL Types

```typescript
GqlMember {
  id: number
  github: string
  discordId: string
  name: string
  createdAt: string
}

GqlGeneration {
  id: number
  name: string
  startedAt: string
  isActive: boolean
  createdAt: string
}

GqlCycle {
  id: number
  generationId: number
  week: number
  startDate: string
  endDate: string
  githubIssueUrl: string
  createdAt: string
}

GqlCycleStatus {
  cycle: GqlCycle
  summary: { submitted: number, notSubmitted: number, total: number }
  submitted: GqlMember[]
  notSubmitted: GqlMember[]
}
```

## Key Insights (Interpretation)

### 1. Code-First Approach: Developer Experience Advantage

**Benefits**:
- **Type Safety**: TypeScript types automatically generate GraphQL schema
- **Single Source of Truth**: Schema defined in code, not separate SDL
- **IDE Support**: Autocomplete and refactoring work seamlessly
- **Refactoring Safety**: Rename a field in TypeScript, schema updates automatically

**Comparison with Schema-First**:
```
Schema-First:
1. Write GraphQL schema in .graphql file
2. Generate TypeScript types from schema
3. Write resolvers matching schema
4. Keep schema and types in sync manually

Code-First (Pylon):
1. Write TypeScript classes
2. Schema generates automatically
3. Refactoring is safe
```

**Business Value**:
- Faster development iteration
- Fewer bugs from schema/type mismatches
- Easier onboarding for TypeScript developers

### 2. Flexible Data Fetching: Network Efficiency

**GraphQL Advantage**: Clients request exactly what they need

**Example**: Member list with minimal fields
```graphql
query {
  members {
    id
    name
  }
}
```

**Example**: Member list with all fields
```graphql
query {
  members {
    id
    github
    discordId
    name
    createdAt
  }
}
```

**REST Equivalent Comparison**:
```
REST: GET /api/members
→ Returns all fields (over-fetching)
→ Multiple endpoints for different field combinations

GraphQL: Single endpoint
→ Client specifies fields
→ No over-fetching or under-fetching
```

**Network Efficiency**:
- Small payloads for mobile clients
- Reduced bandwidth usage
- Faster response times

### 3. CQRS Integration: Clean Architecture Alignment

**Query Separation**:
```typescript
// GraphQL Queries → CQRS Query Handlers
members() → GetAllMembersQuery.execute()
member(github) → GetMemberByGithubQuery.execute(github)
cycleStatus(cycleId, orgSlug) → GetCycleStatusQuery.getCycleStatus()
```

**Mutation Alignment**:
```typescript
// GraphQL Mutations → CQRS Commands
addMember(...) → CreateMemberCommand.execute()
addGeneration(...) → CreateGenerationCommand.execute()
addCycle(...) → CreateCycleCommand.execute()
```

**Business Value**:
- Consistent architecture across HTTP and GraphQL
- Reusable business logic
- Single source of truth for data operations

### 4. Hardcoded Organization Limitation

**Current Issue**:
```typescript
const currentCycle = await getCycleStatusQuery.getCurrentCycle('dongueldonguel');
```

**Problems**:
- `activeCycle` query only works for 'dongueldonguel' organization
- Multi-tenant architecture not fully leveraged
- Reduces value of organization system

**Opportunity**:
- Make organization parameter required
- Add context-based organization detection
- Support cross-organization queries

### 5. Incomplete Mutation Coverage

**Missing Mutations**:
- No `updateMember` mutation
- No `joinOrganization` mutation
- No `approveMember` mutation
- No `addSubmission` mutation (intentionally deferred to webhook)

**Current State**:
- Query coverage: ~80% (most read operations)
- Mutation coverage: ~20% (basic create operations only)

**Impact**:
- Clients must use REST API for write operations
- Inconsistent developer experience
- Reduced GraphQL adoption value

### 6. Introspection: Development Blessing, Production Risk

**Current Setting**: `introspection: true`

**Development Benefits**:
- Tools like GraphiQL can explore schema
- Auto-documentation
- Easy testing

**Production Risks**:
- Exposes entire schema structure
- Reveals business logic patterns
- May aid attackers in finding vulnerabilities

**Recommendation**:
- Development: `introspection: true`
- Production: `introspection: false` (or authenticated only)

## Stakeholder Impact

### Frontend Developers

**Benefits**:
- **Type Safety**: Auto-generated TypeScript types
- **Flexibility**: Request exact data needed
- **Documentation**: Introspection provides built-in schema docs
- **Tooling**: Rich ecosystem (Apollo, Relay, URQL)

**Pain Points**:
- **Learning Curve**: GraphQL concepts (fragments, directives)
- **Incomplete API**: Must use REST for some operations
- **Organization Context**: Hardcoded values limit flexibility

### API Consumers

**Benefits**:
- **Single Endpoint**: `/graphql` for all operations
- **Efficient Payloads**: No over-fetching
- **Strong Typing**: Clear contracts

**Pain Points**:
- **Mutation Limitations**: Cannot perform all operations via GraphQL
- **Error Handling**: GraphQL error format differs from REST
- **Maturity**: Less familiar than REST to many developers

### Business Analysts

**Benefits**:
- **Schema as Documentation**: Introspection provides live API docs
- **Type Safety**: Reduces integration bugs
- **Flexibility**: Easy to add new fields without breaking clients

**Pain Points**:
- **Complexity**: Harder to understand than simple REST endpoints
- **Tooling**: Requires GraphQL-aware tools
- **Monitoring**: Need GraphQL-specific observability tools

## Recommendations

### 1. Complete Mutation Coverage (High Priority)

**Problem**: Incomplete write operations via GraphQL

**Solution**: Add missing mutations
```typescript
// Organization management
joinOrganization(organizationSlug: string): GqlOrganizationMember
approveMember(organizationMemberId: number): GqlOrganizationMember

// Member updates
updateMemberName(memberId: number, name: string): GqlMember
updateMemberDiscord(memberId: number, discordId: string): GqlMember

// Cycle management
updateCycle(cycleId: number, endDate: string): GqlCycle
```

**Expected Effect**: Enable GraphQL-first development, reduce REST dependency

### 2. Add Authentication Layer (High Priority)

**Problem**: No authorization on GraphQL operations

**Solution**: Implement context-based auth
```typescript
// Pylon context
const context = async () => {
  const token = await getAuthTokenfromRequest();
  const user = await verifyToken(token);

  return {
    user,
    dataSource: {
      members: () => user.canReadMembers() ? memberRepo : null
    }
  };
};

// Protect queries/mutations
@Query()
@Authorized()
async members() {
  return this.memberService.findAll();
}
```

**Expected Effect**: Secure API, prevent unauthorized data access

### 3. Remove Hardcoded Organization (Medium Priority)

**Problem**: Organization context hardcoded

**Solution**: Require organization parameter
```typescript
// Before
async activeCycle() {
  return this.query.getCurrentCycle('dongueldonguel');
}

// After
async activeCycle(organizationSlug: string) {
  return this.query.getCurrentCycle(organizationSlug);
}
```

**Expected Effect**: Enable multi-organization GraphQL queries

### 4. Implement Pagination (Medium Priority)

**Problem**: No pagination on list queries

**Current**:
```graphql
query {
  members {
    id
    name
    # Returns ALL members - potential performance issue
  }
}
```

**Solution**: Add cursor-based pagination
```graphql
query {
  members(first: 10, after: "cursor") {
    edges {
      node {
        id
        name
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Expected Effect**: Improved performance, predictable response sizes

### 5. Add Subscriptions for Real-time Updates (Low Priority)

**Opportunity**: Real-time submission notifications

```graphql
subscription onSubmissionRecorded(cycleId: number) {
  submissionRecorded(cycleId: $cycleId) {
    id
    member {
      name
    }
    url
    submittedAt
  }
}
```

**Use Cases**:
- Live submission feed
- Real-time status updates
- Collaborative editing scenarios

**Expected Effect**: Enhanced real-time capabilities

### 6. Disable Introspection in Production (Security)

**Problem**: Schema exposed to all

**Solution**:
```typescript
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: env.NODE_ENV === 'development',
});
```

**Expected Effect**: Reduce attack surface, hide implementation details

## Risk/Opportunity Assessment

### Opportunities

1. **GraphQL Ecosystem**
   - Apollo Client for React apps
   - GraphQL Code Generator for TypeScript types
   - GraphiQL for API exploration

2. **Federation Potential**
   - Multiple GraphQL services composed into one
   - Separate services for different domains
   - Scalability for large teams

3. **Performance Optimization**
   - DataLoader for batching queries
   - Query complexity analysis
   - Persistent queries (cache query IDs)

### Risks

1. **Query Complexity Attacks**
   - Nested queries can cause performance issues
   - Malicious clients could craft expensive queries
   - **Mitigation**: Query complexity limiting, depth limiting

2. **N+1 Query Problem**
   - GraphQL resolvers may trigger database N+1 queries
   - Example: `members { generation { organization } }`
   - **Mitigation**: DataLoader, query batching

3. **Caching Complexity**
   - GraphQL POST requests not cacheable by default
   - Requires GET requests with persisted queries
   - **Mitigation**: Apollo Server cache plugins, CDN caching

4. **Monitoring Challenges**
   - All queries go to `/graphql` endpoint
   - Harder to track specific operations
   - **Mitigation**: GraphQL-aware monitoring (Apollo Studio)

## Needed Data

To deepen analysis, collect:

1. **Usage Metrics**
   - Most frequently executed queries
   - Average query complexity
   - Query response time distribution (p50, p95, p99)

2. **Client Patterns**
   - Number of GraphQL clients
   - Query depth distribution
   - Field usage patterns

3. **Performance Metrics**
   - Database queries per GraphQL request
   - N+1 query occurrences
   - Cache hit rates

4. **Developer Feedback**
   - GraphQL vs REST preference
   - Pain points with current implementation
   - Desired features

---

**Last Updated**: 2026-01-11
**Next Review**: 2026-02-11 (1 month)
**Maintained By**: Business Context Analyst
