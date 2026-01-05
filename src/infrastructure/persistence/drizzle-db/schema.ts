import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

// 멤버 테이블
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  github: text('github').notNull().unique(),
  discordId: text('discord_id').unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 기수 테이블
export const generations = pgTable('generations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // 예: "똥글똥글 1기"
  startedAt: timestamp('started_at').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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

// 기수-멤버 조인 테이블
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
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;
export type GenerationMember = typeof generationMembers.$inferSelect;
export type NewGenerationMember = typeof generationMembers.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
