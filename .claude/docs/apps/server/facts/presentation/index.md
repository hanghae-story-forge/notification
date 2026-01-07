# Presentation Layer Facts

- **Scope**: apps/server/src/presentation
- **Layer**: Presentation Layer
- **Source of Truth**: HTTP routes, GraphQL resolvers, Discord bot commands
- **Last Verified**: 2026-01-07
- **Repo Ref**: 9164ce1

## Overview

The presentation layer handles external interactions through multiple interfaces:
- **HTTP API**: REST endpoints for GitHub webhooks, status queries, reminders
- **GraphQL API**: Pylon-based GraphQL with code-first approach
- **Discord Bot**: Slash commands for member management

---

## HTTP API

### Entry Point

- **Location**: `apps/server/src/index.ts` (L1-129)
- **Framework**: Hono
- **Server**: `@hono/node-server`

### Route Registration

```typescript
// Health check
app.get('/health', async (c) => { /* ... */ });

// Root
app.get('/', (c) => c.json({ status: 'ok', message: '똥글똥글 API' }));

// GitHub webhook
app.post('/webhook/github', async (c) => {
  const githubEvent = c.req.header('x-github-event');
  if (githubEvent === 'issue_comment') return handleIssueComment(c);
  if (githubEvent === 'issues') return handleIssues(c);
  return handleUnknownEvent(c);
});

// Reminder API
app.get('/api/reminder', getReminderCycles);
app.get('/api/reminder/:cycleId/not-submitted', getNotSubmittedMembers);
app.post('/api/reminder/send-reminders', sendReminderNotifications);

// Status API
app.get('/api/status/current', getCurrentCycle);
app.get('/api/status/current/discord', getCurrentCycleDiscord);
app.get('/api/status/:cycleId', getStatus);
app.get('/api/status/:cycleId/discord', getStatusDiscord);
```

---

### GitHub Webhook Handlers

#### POST /webhook/github

- **Location**: `apps/server/src/presentation/http/github/github.handlers.ts`
- **Purpose**: Receives GitHub webhook events for submissions and cycle creation
- **Events**: `issue_comment`, `issues`

##### handleIssueComment (Issue Comment Created)

- **Location**: `apps/server/src/presentation/http/github/github.handlers.ts` (L111-181)
- **Trigger**: GitHub Issue comment created
- **Purpose**: Records blog post submission

**Request**:
```typescript
// GitHub webhook payload
{
  comment: {
    user: { login: string },      // GitHub username
    body: string,                 // Comment body (contains blog URL)
    id: number                    // Comment ID
  },
  issue: {
    html_url: string              // Issue URL (identifies cycle)
  }
}
```

**Logic**:
1. Extract GitHub username from comment
2. Extract first URL from comment body (regex: `https?:\/\/[^\s]+`)
3. Execute `RecordSubmissionCommand`
4. Send Discord notification if webhook configured

**Response**:
- `200 OK`: Submission recorded
- `400 BAD_REQUEST`: No URL found in comment
- `404 NOT_FOUND`: Cycle/member not found
- `409 CONFLICT`: Duplicate submission (already exists)
- `500 INTERNAL_SERVER_ERROR`: Unexpected error

**Evidence**:
```typescript
// Extract URL from comment
const urlMatch = commentBody.match(/(https?:\/\/[^\s]+)/);
if (!urlMatch) {
  return c.json({ message: 'No URL found in comment' }, 400);
}

// Execute command
const result = await recordSubmissionCommand.execute({
  githubUsername,
  blogUrl: urlMatch[1],
  githubCommentId: commentId,
  githubIssueUrl: issue.html_url,
});

// Send Discord notification
if (discordWebhookUrl) {
  await discordClient.sendSubmissionNotification(
    discordWebhookUrl,
    result.memberName,
    result.cycleName,
    blogUrl
  );
}
```

##### handleIssues (Issue Created)

- **Location**: `apps/server/src/presentation/http/github/github.handlers.ts` (L184-254)
- **Trigger**: GitHub Issue created
- **Purpose**: Creates new cycle from issue

**Request**:
```typescript
{
  issue: {
    title: string,                // Issue title (contains week number)
    body: string | null,          // Issue body (may contain deadline)
    html_url: string              // Issue URL
  },
  repository: {
    name: string                  // Repository name (identifies organization)
  }
}
```

**Logic**:
1. Parse week number from issue title
   - Patterns: `[1주차]`, `1주차`, `[week 1]`, `week 1`, `[1] 주`
2. Parse deadline from issue body (optional)
   - Pattern: `마감: YYYY-MM-DD` or `DEADLINE: YYYY-MM-DDTHH:MM:SS`
3. Default to 7-day cycle if no dates provided
4. Extract organization slug from repo name or query param
5. Execute `CreateCycleCommand`

**Response**:
- `201 CREATED`: Cycle created
- `200 OK`: Cycle already exists (no error)
- `400 BAD_REQUEST`: No week pattern found
- `404 NOT_FOUND`: Organization/generation not found
- `409 CONFLICT`: Duplicate cycle

**Evidence**:
```typescript
// Parse week from title
function parseWeekFromTitle(title: string): number | null {
  const patterns = [
    /\[(\d+)주차\]/,
    /(\d+)주차/,
    /\[week\s*(\d+)\]/i,
    /week\s*(\d+)/i,
    /\[(\d+)\]\s*주/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// Parse dates from body
function parseDatesFromBody(body: string | null): { start: Date; end: Date } | null {
  const deadlinePattern = /(?:마감|deadline|due)[:\s]*(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}))?/i;
  const deadlineMatch = body?.match(deadlinePattern);

  if (deadlineMatch) {
    const deadline = new Date(`${deadlineMatch[1]}${deadlineMatch[2] ? 'T' + deadlineMatch[2] : 'T23:59:59'}`);
    const start = new Date(deadline);
    start.setDate(start.getDate() - 7);
    return { start, end: deadline };
  }
  return null;
}
```

---

### Reminder API

#### GET /api/reminder

- **Location**: `apps/server/src/presentation/http/reminder/reminder.handlers.ts` (L41-68)
- **Purpose**: Returns cycles with deadlines within specified hours (for n8n workflows)

**Query Parameters**:
- `organizationSlug` (required): Organization identifier
- `hoursBefore` (optional, default: 24): Hours before deadline to include

**Response**:
```typescript
{
  cycles: Array<{
    cycleId: number;
    cycleName: string;          // "N주차"
    endDate: string;             // ISO date
    githubIssueUrl: string | null;
    organizationSlug: string;
  }>
}
```

**Status Codes**:
- `200 OK`: Success
- `400 BAD_REQUEST`: Missing organizationSlug
- `404 NOT_FOUND`: Organization not found
- `500 INTERNAL_SERVER_ERROR`: Unexpected error

---

#### GET /api/reminder/:cycleId/not-submitted

- **Location**: `apps/server/src/presentation/http/reminder/reminder.handlers.ts` (L71-98)
- **Purpose**: Returns members who haven't submitted for a cycle

**Path Parameters**:
- `cycleId`: Cycle ID

**Query Parameters**:
- `organizationSlug` (required): Organization identifier

**Response**:
```typescript
{
  cycleId: number;
  week: number;
  endDate: string;
  notSubmitted: Array<{
    github: string;
    name: string;
    discordId: string | null;
  }>;
  submittedCount: number;
  totalMembers: number;
}
```

**Status Codes**:
- `200 OK`: Success
- `400 BAD_REQUEST`: Missing organizationSlug
- `404 NOT_FOUND`: Cycle/organization not found
- `500 INTERNAL_SERVER_ERROR`: Unexpected error

---

#### POST /api/reminder/send-reminders

- **Location**: `apps/server/src/presentation/http/reminder/reminder.handlers.ts` (L101-175)
- **Purpose**: Sends Discord reminder notifications for cycles nearing deadline

**Query Parameters**:
- `organizationSlug` (required): Organization identifier
- `hoursBefore` (optional, default: 24): Hours before deadline

**Environment Variables**:
- `DISCORD_WEBHOOK_URL` (required): Discord webhook URL

**Logic**:
1. Find cycles with deadline in range
2. For each cycle:
   - Get not-submitted members
   - Skip if all submitted
   - Send Discord webhook
3. Return count of sent reminders

**Response**:
```typescript
{
  sent: number;                  // Number of reminders sent
  cycles: Array<{
    cycleId: number;
    cycleName: string;
  }>;
}
```

**Status Codes**:
- `200 OK`: Reminders sent
- `400 BAD_REQUEST`: Missing organizationSlug
- `500 INTERNAL_SERVER_ERROR`: Discord webhook not configured or error

---

### Status API

#### GET /api/status/current

- **Location**: `apps/server/src/presentation/http/status/status.handlers.ts` (L40-68)
- **Purpose**: Returns currently active cycle for an organization

**Query Parameters**:
- `organizationSlug` (required): Organization identifier

**Response**:
```typescript
{
  id: number;
  week: number;
  generationName: string;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  daysLeft: number;
  hoursLeft: number;
  organizationSlug: string;
} | null
```

**Status Codes**:
- `200 OK`: Success
- `400 BAD_REQUEST`: Missing organizationSlug
- `404 NOT_FOUND`: No active cycle
- `500 INTERNAL_SERVER_ERROR`: Unexpected error

---

#### GET /api/status/current/discord

- **Location**: `apps/server/src/presentation/http/status/status.handlers.ts` (L71-121)
- **Purpose**: Returns current cycle status formatted as Discord webhook payload

**Query Parameters**:
- `organizationSlug` (required): Organization identifier

**Response**: Discord webhook payload
```typescript
{
  embeds: [{
    title: string;              // "{generation} - {N}주차 제출 현황"
    color: number;              // 0x0099ff (blue)
    fields: [
      { name: "✅ 제출 (N)", value: string, inline: false },
      { name: "❌ 미제출 (N)", value: string, inline: false },
      { name: "⏰ 마감 시간", value: string, inline: false }
    ],
    timestamp: string;
  }]
}
```

**Status Codes**: Same as `/api/status/current`

---

#### GET /api/status/:cycleId

- **Location**: `apps/server/src/presentation/http/status/status.handlers.ts` (L124-151)
- **Purpose**: Returns detailed submission status for a specific cycle

**Path Parameters**:
- `cycleId`: Cycle ID

**Query Parameters**:
- `organizationSlug` (required): Organization identifier

**Response**:
```typescript
{
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
  submitted: Array<{
    name: string;
    github: string;
    url: string;
    submittedAt: string;
  }>;
  notSubmitted: Array<{
    name: string;
    github: string;
  }>;
}
```

**Status Codes**:
- `200 OK`: Success
- `400 BAD_REQUEST`: Missing organizationSlug
- `404 NOT_FOUND`: Cycle/organization not found
- `500 INTERNAL_SERVER_ERROR`: Unexpected error

---

#### GET /api/status/:cycleId/discord

- **Location**: `apps/server/src/presentation/http/status/status.handlers.ts` (L154-193)
- **Purpose**: Returns cycle status formatted as Discord webhook payload

**Path Parameters**:
- `cycleId`: Cycle ID

**Query Parameters**:
- `organizationSlug` (required): Organization identifier

**Response**: Discord webhook payload (same format as `/api/status/current/discord`)

**Status Codes**: Same as `/api/status/:cycleId`

---

### Health Check

#### GET /health

- **Location**: `apps/server/src/index.ts` (L44-65)
- **Purpose**: Health check for Docker/Kubernetes

**Response**:
```typescript
// Healthy
{
  status: "healthy";
  database: "connected";
  timestamp: string;             // ISO date
}

// Unhealthy
{
  status: "unhealthy";
  database: "disconnected";
  error: string;
  timestamp: string;
}
```

**Status Codes**:
- `200 OK`: Database connected
- `503 SERVICE UNAVAILABLE`: Database disconnected

**Logic**: Executes `SELECT 1` against database to verify connection.

---

## GraphQL API

### Overview

- **Framework**: Pylon (code-first GraphQL)
- **Location**: `apps/server/src/presentation/graphql/`
- **Schema**: Auto-generated from TypeScript resolvers

### Service Definition

- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L10-13)

```typescript
export const graphql = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
};
```

### Resolvers Organization

```
resolvers/
├── index.ts (combines all resolvers)
├── member.resolver.ts
├── generation.resolver.ts
├── cycle.resolver.ts
└── organization.resolver.ts
```

---

### Member Resolvers

- **Location**: `apps/server/src/presentation/graphql/resolvers/member.resolver.ts` (L1-61)

#### Queries

##### members

- **Returns**: `GqlMember[]`
- **Purpose**: Get all members

**Logic**:
```typescript
const members = await getAllMembersQuery.execute();
return members.map(domainToGraphqlMember);
```

##### member(github: string!)

- **Returns**: `GqlMember | null`
- **Purpose**: Get member by GitHub username

**Logic**:
```typescript
const member = await getMemberByGithubQuery.execute(github);
return member ? domainToGraphqlMember(member) : null;
```

#### Mutations

##### addMember(github: String!, name: String!, discordId: String)

- **Returns**: `GqlMember`
- **Purpose**: Create new member

**Logic**:
```typescript
const result = await createMemberCommand.execute({
  githubUsername: github,
  name,
  discordId,
});
return domainToGraphqlMember(result.member);
```

---

### Generation Resolvers

- **Location**: `apps/server/src/presentation/graphql/resolvers/generation.resolver.ts`

#### Queries

- `generations(organizationSlug: String!)`: Get all generations for organization
- `generation(id: Int!)`: Get generation by ID

#### Mutations

- `createGeneration(name: String!, organizationSlug: String!, startedAt: String!)`: Create generation

---

### Cycle Resolvers

- **Location**: `apps/server/src/presentation/graphql/resolvers/cycle.resolver.ts`

#### Queries

- `cycles(generationId: Int!)`: Get all cycles for generation
- `cycle(id: Int!)`: Get cycle by ID
- `currentCycle(organizationSlug: String!)`: Get active cycle for organization

#### Mutations

- `createCycle(week: Int!, organizationSlug: String!, startDate: String, endDate: String!, githubIssueUrl: String!)`: Create cycle

---

### Organization Resolvers

- **Location**: `apps/server/src/presentation/graphql/resolvers/organization.resolver.ts`

#### Queries

- `organizations`: Get all organizations
- `organization(slug: String!)`: Get organization by slug
- `organizationMembers(organizationSlug: String!)`: Get active members

#### Mutations

- `createOrganization(name: String!, slug: String, discordWebhookUrl: String)`: Create organization

---

### GraphQL Types

#### GqlMember

- **Location**: `apps/server/src/presentation/graphql/types/member.type.ts` (L5-19)

```typescript
class GqlMember {
  id: number;
  github: string;                // GitHub username
  discordId: string | null;      // Discord User ID
  name: string;                  // Display name
  createdAt: string;             // ISO date
}
```

**Constructor**: Takes `Member` domain entity and extracts properties.

---

### Mappers

#### domainToGraphqlMember

- **Location**: `apps/server/src/presentation/graphql/mappers/member.mapper.ts` (L6-8)

```typescript
export const domainToGraphqlMember = (member: Member): GqlMember => {
  return new GqlMember(member);
};
```

**Purpose**: Converts domain entity to GraphQL type.

**Pattern**: Same mapping used for all domain entities (Member, Generation, Cycle, Organization).

---

## Discord Bot

### Bot Setup

- **Location**: `apps/server/src/presentation/discord/bot.ts` (L23-68)
- **Library**: discord.js
- **Intents**: `Guilds`, `GuildMessages`

#### Initialization

```typescript
export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
      // Handle autocomplete
      if (options.getFocused(true).name === 'organization') {
        await organizationAutocomplete.execute(interaction);
      }
      if (options.getFocused(true).name === 'generation') {
        await generationAutocomplete.execute(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commandMap.get(commandName);
    if (command) {
      await command.execute(interaction);
    }
  });

  return client;
};
```

#### Slash Command Registration

- **Trigger**: On server startup (if `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` are set)
- **Location**: `apps/server/src/index.ts` (L103-121)

```typescript
if (env.DISCORD_BOT_TOKEN && env.DISCORD_CLIENT_ID) {
  void (async () => {
    const commands = createCommands();
    await registerSlashCommands(commands);
    const discordBot = createDiscordBot();
    await discordBot.login(env.DISCORD_BOT_TOKEN);
  })();
}
```

---

### Discord Commands

All commands implement `DiscordCommand` interface:

```typescript
interface DiscordCommand {
  definition: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
```

#### /register

- **Location**: `apps/server/src/presentation/discord/commands/RegisterCommand.ts` (L6-75)
- **Purpose**: Register as a member

**Options**:
- `name` (required): Real name
- `github` (optional): GitHub username

**Logic**:
1. Defer reply (ephemeral)
2. Get Discord user info (ID, username, avatar)
3. Execute `CreateMemberCommand`
4. Update Discord username/avatar on member
5. Save member
6. Reply with success message

**Response**:
```
✅ 회원 등록이 완료되었습니다!

**이름**: {name}
**Discord**: {username}
**GitHub**: {github or '미연결'}

📝 다음 단계:
1. /join-organization - 조직에 가입 신청
2. 관리자 승인 후 /join-generation - 기수 참여
```

**Errors**:
- Already registered: "❌ 이미 등록된 회원입니다."
- Other: "❌ 회원 등록 중 오류가 발생했습니다: {message}"

---

#### /join-organization

- **Location**: `apps/server/src/presentation/discord/commands/JoinOrganizationCommand.ts`
- **Purpose**: Request to join an organization

**Options**:
- `organization` (required, autocomplete): Organization slug

**Logic**:
1. Get Discord user ID
2. Find member by Discord ID
3. Execute `JoinOrganizationCommand`
4. Reply with pending status

**Response**:
```
✅ {organizationName} 조직에 가입 신청을 완료했습니다!

관리자 승인을 기다려주세요.
```

---

#### /create-organization

- **Location**: `apps/server/src/presentation/discord/commands/CreateOrganizationCommand.ts`
- **Purpose**: Create new organization

**Options**:
- `name` (required): Organization name
- `slug` (optional): URL slug (auto-generated from name if not provided)

**Logic**:
1. Execute `CreateOrganizationCommand`
2. Reply with success

**Response**:
```
✅ 조직 생성이 완료되었습니다!

**이름**: {name}
**슬러그**: {slug}

📝 다음 단계:
1. /join-organization {slug} - 조직에 가입
```

---

#### /approve-member

- **Location**: `apps/server/src/presentation/discord/commands/ApproveMemberCommand.ts`
- **Purpose**: Approve pending organization member (admin only)

**Options**:
- `organization` (required, autocomplete): Organization slug
- `member` (required, autocomplete): Member Discord ID

**Logic**:
1. Verify caller is admin/owner
2. Execute `UpdateMemberStatusCommand` with action: 'approve'
3. Reply with success

**Response**:
```
✅ {memberName}님의 가입이 승인되었습니다!
```

---

#### /join-generation

- **Location**: `apps/server/src/presentation/discord/commands/JoinGenerationCommand.ts`
- **Purpose**: Join a generation

**Options**:
- `generation` (required, autocomplete): Generation ID

**Logic**:
1. Get Discord user ID
2. Find member
3. Execute `JoinGenerationCommand`
4. Reply with success

**Response**:
```
✅ {generationName} 기수에 참여가 완료되었습니다!
```

---

#### /cycle-status

- **Location**: `apps/server/src/presentation/discord/commands/CycleStatusCommand.ts`
- **Purpose**: Show submission status for current cycle

**Options**:
- `organization` (required, autocomplete): Organization slug

**Logic**:
1. Get current cycle for organization
2. Get submission status
3. Format as Discord embed
4. Reply with embed

**Response**: Discord embed with submission summary

---

#### /current-cycle

- **Location**: `apps/server/src/presentation/discord/commands/CurrentCycleCommand.ts`
- **Purpose**: Show current active cycle info

**Options**:
- `organization` (required, autocomplete): Organization slug

**Response**: Cycle info with deadline

---

#### /check-submission

- **Location**: `apps/server/src/presentation/discord/commands/CheckSubmissionCommand.ts`
- **Purpose**: Check if you've submitted for current cycle

**Options**:
- `organization` (required, autocomplete): Organization slug

**Response**: Your submission status

---

#### /list-organizations

- **Location**: `apps/server/src/presentation/discord/commands/ListOrganizationsCommand.ts`
- **Purpose**: List all organizations

**Response**: List of organizations

---

### Autocompletes

#### OrganizationAutocomplete

- **Location**: `apps/server/src/presentation/discord/autocompletions/OrganizationAutocomplete.ts`
- **Purpose**: Autocomplete organization slug

**Logic**:
1. Get all organizations
2. Filter by user input
3. Return choices

---

#### GenerationAutocomplete

- **Location**: `apps/server/src/presentation/discord/autocompletions/GenerationAutocomplete.ts`
- **Purpose**: Autocomplete generation ID

**Logic**:
1. Get all generations for organization
2. Filter by user input
3. Return choices

---

## Error Handling

### HTTP Error Response Format

```typescript
{
  error: string;                 // Error message
}
```

### Error Mapping

| Domain Error | HTTP Status | Example |
|--------------|-------------|---------|
| `NotFoundError` | 404 | Cycle not found |
| `ConflictError` | 409 | Duplicate submission |
| `ValidationError` | 400 | Invalid input |
| `ForbiddenError` | 403 | Not a member |
| Other | 500 | Internal server error |

---

## Request/Response Flow

### HTTP Request Flow

```
HTTP Request (Hono)
  → Route Handler
    → Parse Request (params, query, body)
      → Execute Command/Query
        → Domain Logic (validation, business rules)
          → Repository (database)
        → Return Result
      → Format Response
    → Send HTTP Response
```

### GraphQL Request Flow

```
GraphQL Query (Pylon)
  → Resolver
    → Execute Query/Command
      → Domain Logic
        → Repository
      → Return Result
    → Map to GraphQL Type (Mapper)
  → Return GraphQL Response
```

### Discord Command Flow

```
Discord Slash Command
  → Discord Bot Event
    → Parse Options
      → Execute Command/Query
        → Domain Logic
          → Repository
        → Return Result
      → Format Discord Message
    → Send Discord Reply
```

---

## Evidence

```typescript
// Example: HTTP handler with query execution
export const getCurrentCycle = async (c: AppContext) => {
  const organizationSlug = c.req.query('organizationSlug');

  if (!organizationSlug) {
    return c.json(
      { error: 'organizationSlug query parameter is required' },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  try {
    const result = await getCycleStatusQuery.getCurrentCycle(organizationSlug);

    if (!result) {
      return c.json(
        { error: 'No active cycle found' },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    console.error('Unexpected error in getCurrentCycle:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
```

```typescript
// Example: GraphQL resolver
export const memberQueries = {
  members: async (): Promise<GqlMember[]> => {
    const members = await getAllMembersQuery.execute();
    return members.map(domainToGraphqlMember);
  },

  member: async (github: string): Promise<GqlMember | null> => {
    const member = await getMemberByGithubQuery.execute(github);
    return member ? domainToGraphqlMember(member) : null;
  },
};
```

```typescript
// Example: Discord command
export class RegisterCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('register')
    .setDescription('회원으로 등록합니다')
    .addStringOption((option) =>
      option.setName('name').setDescription('실제 이름').setRequired(true)
    );

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name', true);
    const githubUsername = interaction.options.getString('github', false);
    const discordId = interaction.user.id;

    const result = await this.createMemberCommand.execute({
      githubUsername: githubUsername ?? '',
      name,
      discordId,
    });

    await interaction.editReply({
      content: `✅ 회원 등록이 완료되었습니다!\n\n**이름**: ${name}`,
    });
  }
}
```
