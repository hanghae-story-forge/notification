import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const organizationMemberStatusEnum = pgEnum(
  'organization_member_status',
  ['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE']
);

export const organizationRoleEnum = pgEnum('organization_role', [
  'OWNER',
  'ADMIN',
  'MEMBER',
]);

// Organizations (스터디 그룹)
export const organizations = pgTable(
  'organizations',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(), // URL-friendly identifier
    discordWebhookUrl: text('discord_webhook_url'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('organizations_slug_idx').on(table.slug),
  })
);

// Members (디스코드 기반, 조직에 속하지 않아도 됨)
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  discordId: text('discord_id').notNull().unique(), // Discord User ID (고유)
  discordUsername: text('discord_username'), // Discord username (변경 가능)
  discordAvatar: text('discord_avatar'), // Discord avatar hash
  githubUsername: text('github_username'), // GitHub username (optional, 더 이상 unique 아님)
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 기수 테이블
export const generations = pgTable(
  'generations',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(), // 예: "똥글똥글 1기"
    startedAt: timestamp('started_at').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index('generations_org_idx').on(table.organizationId),
  })
);

// 사이클(주차) 테이블
export const cycles = pgTable(
  'cycles',
  {
    id: serial('id').primaryKey(),
    generationId: integer('generation_id')
      .notNull()
      .references(() => generations.id),
    week: integer('week').notNull(), // 1, 2, 3...
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    githubIssueUrl: text('github_issue_url'), // archive 레포 이슈 URL
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    generationIdx: index('cycles_generation_idx').on(table.generationId),
  })
);

// Organization-Members 조인 테이블 (기수-멤버 조인 테이블 대체)
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    role: organizationRoleEnum('role').notNull(),
    status: organizationMemberStatusEnum('status').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orgMemberIdx: index('org_members_org_member_idx').on(
      table.organizationId,
      table.memberId
    ),
    statusIdx: index('org_members_status_idx').on(table.status),
  })
);

// 기수-멤버 조인 테이블 (deprecated, organizationMembers로 대체)
export const generationMembers = pgTable(
  'generation_members',
  {
    id: serial('id').primaryKey(),
    generationId: integer('generation_id')
      .notNull()
      .references(() => generations.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    generationMemberIdx: index('gen_members_gen_member_idx').on(
      table.generationId,
      table.memberId
    ),
  })
);

// 제출 테이블
export const submissions = pgTable(
  'submissions',
  {
    id: serial('id').primaryKey(),
    cycleId: integer('cycle_id')
      .notNull()
      .references(() => cycles.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    url: text('url').notNull(), // 블로그 글 URL
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    githubCommentId: text('github_comment_id').unique(), // GitHub 댓글 ID (중복 방지)
  },
  (table) => ({
    cycleMemberIdx: index('submissions_cycle_member_idx').on(
      table.cycleId,
      table.memberId
    ),
  })
);

// 타입 내보내기
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;
export type GenerationMember = typeof generationMembers.$inferSelect;
export type NewGenerationMember = typeof generationMembers.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

// Enum 타입 - Drizzle pgEnum은 직접 enum values를 export
export type OrganizationMemberStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'INACTIVE';
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER';
