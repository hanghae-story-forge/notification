import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';

// -----------------------------------------------------------------------------
// Legacy enums kept for backwards compatibility
// -----------------------------------------------------------------------------
export const organizationMemberStatusEnum = pgEnum(
  'organization_member_status',
  ['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE']
);

export const organizationRoleEnum = pgEnum('organization_role', [
  'OWNER',
  'ADMIN',
  'MEMBER',
]);

// -----------------------------------------------------------------------------
// Study Operations enums
// -----------------------------------------------------------------------------
export const studyStatusEnum = pgEnum('study_status', [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
]);

export const generationStatusEnum = pgEnum('generation_status', [
  'DRAFT',
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const cycleStatusEnum = pgEnum('cycle_status', [
  'DRAFT',
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'COMPLETED',
  'CANCELLED',
]);

export const identityProviderEnum = pgEnum('identity_provider', [
  'DISCORD',
  'GITHUB',
]);

export const generationParticipantStatusEnum = pgEnum(
  'generation_participant_status',
  ['APPLIED', 'APPROVED', 'REJECTED', 'INACTIVE', 'REMOVED']
);

export const generationParticipantRoleEnum = pgEnum(
  'generation_participant_role',
  ['OWNER', 'MANAGER', 'PARTICIPANT', 'OBSERVER']
);

export const submissionStatusEnum = pgEnum('submission_status', [
  'PENDING_IDENTITY_MAPPING',
  'PENDING_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'INVALID',
]);

export const submissionTimingStatusEnum = pgEnum('submission_timing_status', [
  'ON_TIME',
  'LATE_PENDING_APPROVAL',
  'LATE_APPROVED',
  'LATE_REJECTED',
]);

export const urlAccessibilityStatusEnum = pgEnum('url_accessibility_status', [
  'UNKNOWN',
  'CHECKING',
  'ACCESSIBLE',
  'INACCESSIBLE',
  'NEEDS_MANUAL_REVIEW',
]);

export const submissionCandidateStatusEnum = pgEnum(
  'submission_candidate_status',
  ['PENDING_IDENTITY_MAPPING', 'RESOLVED', 'IGNORED', 'REJECTED']
);

export const obligationStatusEnum = pgEnum('obligation_status', [
  'REQUIRED',
  'EXEMPT_INACTIVE',
  'EXEMPT_REMOVED',
  'EXEMPT_NON_PARTICIPANT_ROLE',
]);

export const participantCycleResultStatusEnum = pgEnum(
  'participant_cycle_result_status',
  ['SUBMITTED_ON_TIME', 'SUBMITTED_LATE', 'MISSED', 'EXEMPT']
);

export const integrationProviderEnum = pgEnum('integration_provider', [
  'GITHUB',
  'DISCORD',
]);

export const driftStatusEnum = pgEnum('drift_status', [
  'DETECTED',
  'NOTIFIED',
  'RESOLVED',
  'IGNORED',
]);

export const outboxStatusEnum = pgEnum('outbox_status', [
  'PENDING',
  'PROCESSING',
  'PUBLISHED',
  'FAILED',
  'DEAD',
]);

// -----------------------------------------------------------------------------
// Organizations / Studies
// -----------------------------------------------------------------------------
export const organizations = pgTable(
  'organizations',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    discordWebhookUrl: text('discord_webhook_url'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('organizations_slug_idx').on(table.slug),
  })
);

export const studies = pgTable(
  'studies',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    status: studyStatusEnum('status').default('ACTIVE').notNull(),
    defaultCycleCount: integer('default_cycle_count').default(8).notNull(),
    defaultCycleDurationDays: integer('default_cycle_duration_days')
      .default(14)
      .notNull(),
    defaultInactiveThresholdMissedCycles: integer(
      'default_inactive_threshold_missed_cycles'
    )
      .default(3)
      .notNull(),
    defaultDiscordChannelId: text('default_discord_channel_id'),
    timezone: text('timezone').default('Asia/Seoul').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    archivedAt: timestamp('archived_at'),
  },
  (table) => ({
    orgIdx: index('studies_org_idx').on(table.organizationId),
    orgSlugIdx: uniqueIndex('studies_org_slug_uidx').on(
      table.organizationId,
      table.slug
    ),
    statusIdx: index('studies_status_idx').on(table.status),
  })
);

// -----------------------------------------------------------------------------
// Members / identities
// -----------------------------------------------------------------------------
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  discordId: text('discord_id').notNull().unique(),
  discordUsername: text('discord_username'),
  discordAvatar: text('discord_avatar'),
  githubUsername: text('github_username'),
  name: text('name').notNull(),
  status: text('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberIdentities = pgTable(
  'member_identities',
  {
    id: serial('id').primaryKey(),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    provider: identityProviderEnum('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    providerNodeId: text('provider_node_id'),
    username: text('username'),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    rawProfile: jsonb('raw_profile').default({}).notNull(),
    isPrimary: boolean('is_primary').default(true).notNull(),
    linkedAt: timestamp('linked_at').defaultNow().notNull(),
    unlinkedAt: timestamp('unlinked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    memberIdx: index('member_identities_member_idx').on(table.memberId),
    providerUserIdx: uniqueIndex('member_identities_provider_user_uidx').on(
      table.provider,
      table.providerUserId
    ),
    providerUsernameIdx: index('member_identities_provider_username_idx').on(
      table.provider,
      table.username
    ),
  })
);

// -----------------------------------------------------------------------------
// Generations / cycles
// -----------------------------------------------------------------------------
export const generations = pgTable(
  'generations',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    studyId: integer('study_id').references(() => studies.id),
    ordinal: integer('ordinal'),
    name: text('name').notNull(),
    status: generationStatusEnum('status').default('ACTIVE').notNull(),
    plannedCycleCount: integer('planned_cycle_count').default(8).notNull(),
    cycleDurationDays: integer('cycle_duration_days').default(14).notNull(),
    inactiveThresholdMissedCycles: integer(
      'inactive_threshold_missed_cycles'
    )
      .default(3)
      .notNull(),
    discordChannelId: text('discord_channel_id'),
    githubProjectId: text('github_project_id'),
    githubProjectNumber: integer('github_project_number'),
    githubProjectUrl: text('github_project_url'),
    startedAt: timestamp('started_at').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    plannedAt: timestamp('planned_at'),
    activatedAt: timestamp('activated_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index('generations_org_idx').on(table.organizationId),
    studyIdx: index('generations_study_idx').on(table.studyId),
    orgOrdinalIdx: index('generations_org_ordinal_idx').on(
      table.organizationId,
      table.ordinal
    ),
    statusIdx: index('generations_status_idx').on(table.status),
  })
);

export const cycles = pgTable(
  'cycles',
  {
    id: serial('id').primaryKey(),
    generationId: integer('generation_id')
      .notNull()
      .references(() => generations.id),
    week: integer('week').notNull(),
    status: cycleStatusEnum('status').default('SCHEDULED').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    titleOverride: text('title_override'),
    githubIssueUrl: text('github_issue_url'),
    githubIssueId: text('github_issue_id'),
    githubIssueNumber: integer('github_issue_number'),
    githubProjectItemId: text('github_project_item_id'),
    openedAt: timestamp('opened_at'),
    closedAt: timestamp('closed_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    generationIdx: index('cycles_generation_idx').on(table.generationId),
    generationWeekIdx: uniqueIndex('cycles_generation_week_uidx').on(
      table.generationId,
      table.week
    ),
    statusIdx: index('cycles_status_idx').on(table.status),
    dateRangeIdx: index('cycles_date_range_idx').on(
      table.startDate,
      table.endDate
    ),
  })
);

// -----------------------------------------------------------------------------
// Legacy memberships and new generation participant model
// -----------------------------------------------------------------------------
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

// Deprecated legacy join table. Keep for old code paths during migration.
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

export const generationParticipants = pgTable(
  'generation_participants',
  {
    id: serial('id').primaryKey(),
    generationId: integer('generation_id')
      .notNull()
      .references(() => generations.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    status: generationParticipantStatusEnum('status')
      .default('APPLIED')
      .notNull(),
    appliedAt: timestamp('applied_at').defaultNow().notNull(),
    approvedAt: timestamp('approved_at'),
    approvedByMemberId: integer('approved_by_member_id').references(
      () => members.id
    ),
    rejectedAt: timestamp('rejected_at'),
    rejectedByMemberId: integer('rejected_by_member_id').references(
      () => members.id
    ),
    rejectedReason: text('rejected_reason'),
    removedAt: timestamp('removed_at'),
    removedByMemberId: integer('removed_by_member_id').references(
      () => members.id
    ),
    removedReason: text('removed_reason'),
    markedInactiveAt: timestamp('marked_inactive_at'),
    inactiveReason: text('inactive_reason'),
    reactivatedAt: timestamp('reactivated_at'),
    reactivatedByMemberId: integer('reactivated_by_member_id').references(
      () => members.id
    ),
    reactivatedReason: text('reactivated_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    generationMemberIdx: uniqueIndex(
      'generation_participants_generation_member_uidx'
    ).on(table.generationId, table.memberId),
    statusIdx: index('generation_participants_status_idx').on(table.status),
  })
);

export const generationParticipantRoles = pgTable(
  'generation_participant_roles',
  {
    id: serial('id').primaryKey(),
    generationParticipantId: integer('generation_participant_id')
      .notNull()
      .references(() => generationParticipants.id),
    role: generationParticipantRoleEnum('role').notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedByMemberId: integer('assigned_by_member_id').references(
      () => members.id
    ),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    participantRoleIdx: index('generation_participant_roles_role_idx').on(
      table.generationParticipantId,
      table.role
    ),
  })
);

// -----------------------------------------------------------------------------
// Submissions
// -----------------------------------------------------------------------------
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
    generationParticipantId: integer('generation_participant_id').references(
      () => generationParticipants.id
    ),
    url: text('url').notNull(),
    normalizedUrl: text('normalized_url'),
    status: submissionStatusEnum('status').default('ACCEPTED').notNull(),
    timingStatus: submissionTimingStatusEnum('timing_status')
      .default('ON_TIME')
      .notNull(),
    accessibilityStatus: urlAccessibilityStatusEnum('accessibility_status')
      .default('UNKNOWN')
      .notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    sourceType: text('source_type').default('GITHUB_ISSUE_COMMENT').notNull(),
    sourceGithubCommentId: text('source_github_comment_id'),
    sourceGithubCommentUrl: text('source_github_comment_url'),
    sourceGithubIssueId: text('source_github_issue_id'),
    sourceGithubIssueNumber: integer('source_github_issue_number'),
    githubCommentId: text('github_comment_id').unique(),
    invalidReason: text('invalid_reason'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    cycleMemberIdx: index('submissions_cycle_member_idx').on(
      table.cycleId,
      table.memberId
    ),
    participantIdx: index('submissions_participant_idx').on(
      table.generationParticipantId
    ),
    statusIdx: index('submissions_status_idx').on(table.status),
  })
);

export const submissionCandidates = pgTable(
  'submission_candidates',
  {
    id: serial('id').primaryKey(),
    cycleId: integer('cycle_id').references(() => cycles.id),
    generationId: integer('generation_id').references(() => generations.id),
    externalProvider: integrationProviderEnum('external_provider').notNull(),
    externalUsername: text('external_username').notNull(),
    externalUserId: text('external_user_id'),
    rawCommentBody: text('raw_comment_body').notNull(),
    extractedUrls: jsonb('extracted_urls').default([]).notNull(),
    sourceGithubCommentId: text('source_github_comment_id'),
    sourceGithubCommentUrl: text('source_github_comment_url'),
    sourceGithubIssueId: text('source_github_issue_id'),
    sourceGithubIssueNumber: integer('source_github_issue_number'),
    status: submissionCandidateStatusEnum('status')
      .default('PENDING_IDENTITY_MAPPING')
      .notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    resolvedByMemberId: integer('resolved_by_member_id').references(
      () => members.id
    ),
  },
  (table) => ({
    cycleIdx: index('submission_candidates_cycle_idx').on(table.cycleId),
    statusIdx: index('submission_candidates_status_idx').on(table.status),
    externalIdx: index('submission_candidates_external_idx').on(
      table.externalProvider,
      table.externalUsername
    ),
  })
);

export const submissionMetadata = pgTable('submission_metadata', {
  submissionId: integer('submission_id')
    .primaryKey()
    .references(() => submissions.id),
  resolvedUrl: text('resolved_url'),
  canonicalUrl: text('canonical_url'),
  domain: text('domain'),
  title: text('title'),
  description: text('description'),
  siteName: text('site_name'),
  imageUrl: text('image_url'),
  faviconUrl: text('favicon_url'),
  contentType: text('content_type'),
  httpStatus: integer('http_status'),
  fetchStatus: text('fetch_status').default('PENDING').notNull(),
  fetchError: text('fetch_error'),
  fetchedAt: timestamp('fetched_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Reporting projections
// -----------------------------------------------------------------------------
export const cycleObligations = pgTable(
  'cycle_obligations',
  {
    id: serial('id').primaryKey(),
    cycleId: integer('cycle_id')
      .notNull()
      .references(() => cycles.id),
    generationParticipantId: integer('generation_participant_id')
      .notNull()
      .references(() => generationParticipants.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    obligationStatus: obligationStatusEnum('obligation_status')
      .default('REQUIRED')
      .notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    cycleParticipantIdx: uniqueIndex('cycle_obligations_cycle_participant_uidx').on(
      table.cycleId,
      table.generationParticipantId
    ),
  })
);

export const participantCycleResults = pgTable(
  'participant_cycle_results',
  {
    id: serial('id').primaryKey(),
    cycleId: integer('cycle_id')
      .notNull()
      .references(() => cycles.id),
    generationParticipantId: integer('generation_participant_id')
      .notNull()
      .references(() => generationParticipants.id),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    obligationStatus: obligationStatusEnum('obligation_status').notNull(),
    resultStatus: participantCycleResultStatusEnum('result_status').notNull(),
    acceptedSubmissionCount: integer('accepted_submission_count')
      .default(0)
      .notNull(),
    onTimeSubmissionCount: integer('on_time_submission_count')
      .default(0)
      .notNull(),
    lateApprovedSubmissionCount: integer('late_approved_submission_count')
      .default(0)
      .notNull(),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => ({
    cycleParticipantIdx: uniqueIndex(
      'participant_cycle_results_cycle_participant_uidx'
    ).on(table.cycleId, table.generationParticipantId),
  })
);

export const cycleSubmissionStats = pgTable('cycle_submission_stats', {
  cycleId: integer('cycle_id')
    .primaryKey()
    .references(() => cycles.id),
  requiredParticipantCount: integer('required_participant_count')
    .default(0)
    .notNull(),
  submittedParticipantCount: integer('submitted_participant_count')
    .default(0)
    .notNull(),
  onTimeSubmittedParticipantCount: integer('on_time_submitted_participant_count')
    .default(0)
    .notNull(),
  lateSubmittedParticipantCount: integer('late_submitted_participant_count')
    .default(0)
    .notNull(),
  acceptedSubmissionCount: integer('accepted_submission_count')
    .default(0)
    .notNull(),
  onTimeSubmissionCount: integer('on_time_submission_count')
    .default(0)
    .notNull(),
  lateApprovedSubmissionCount: integer('late_approved_submission_count')
    .default(0)
    .notNull(),
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
});

export const participantActivityStats = pgTable('participant_activity_stats', {
  generationParticipantId: integer('generation_participant_id')
    .primaryKey()
    .references(() => generationParticipants.id),
  totalRequiredCycles: integer('total_required_cycles').default(0).notNull(),
  submittedCycles: integer('submitted_cycles').default(0).notNull(),
  missedCycles: integer('missed_cycles').default(0).notNull(),
  consecutiveMissedCycles: integer('consecutive_missed_cycles')
    .default(0)
    .notNull(),
  lastSubmittedCycleId: integer('last_submitted_cycle_id').references(
    () => cycles.id
  ),
  lastMissedCycleId: integer('last_missed_cycle_id').references(() => cycles.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Integration / outbox / notification logs
// -----------------------------------------------------------------------------
export const githubDriftLogs = pgTable(
  'github_drift_logs',
  {
    id: serial('id').primaryKey(),
    provider: integrationProviderEnum('provider').default('GITHUB').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    localSnapshot: jsonb('local_snapshot').default({}).notNull(),
    remoteSnapshot: jsonb('remote_snapshot').default({}).notNull(),
    status: driftStatusEnum('status').default('DETECTED').notNull(),
    detectedAt: timestamp('detected_at').defaultNow().notNull(),
    notifiedAt: timestamp('notified_at'),
    resolvedAt: timestamp('resolved_at'),
    resolvedByMemberId: integer('resolved_by_member_id').references(
      () => members.id
    ),
  },
  (table) => ({
    resourceIdx: index('github_drift_logs_resource_idx').on(
      table.resourceType,
      table.resourceId
    ),
    statusIdx: index('github_drift_logs_status_idx').on(table.status),
  })
);

export const notificationLogs = pgTable('notification_logs', {
  id: serial('id').primaryKey(),
  provider: integrationProviderEnum('provider').default('DISCORD').notNull(),
  channelId: text('channel_id').notNull(),
  messageType: text('message_type').notNull(),
  payload: jsonb('payload').default({}).notNull(),
  externalMessageId: text('external_message_id'),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const domainEvents = pgTable(
  'domain_events',
  {
    id: serial('id').primaryKey(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').default({}).notNull(),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    aggregateIdx: index('domain_events_aggregate_idx').on(
      table.aggregateType,
      table.aggregateId
    ),
    eventTypeIdx: index('domain_events_event_type_idx').on(table.eventType),
  })
);

export const outboxMessages = pgTable(
  'outbox_messages',
  {
    id: serial('id').primaryKey(),
    eventType: text('event_type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').default({}).notNull(),
    status: outboxStatusEnum('status').default('PENDING').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    availableAt: timestamp('available_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
    failedAt: timestamp('failed_at'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    statusAvailableIdx: index('outbox_messages_status_available_idx').on(
      table.status,
      table.availableAt
    ),
  })
);

// -----------------------------------------------------------------------------
// Type exports
// -----------------------------------------------------------------------------
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type MemberIdentity = typeof memberIdentities.$inferSelect;
export type NewMemberIdentity = typeof memberIdentities.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Study = typeof studies.$inferSelect;
export type NewStudy = typeof studies.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;
export type GenerationMember = typeof generationMembers.$inferSelect;
export type NewGenerationMember = typeof generationMembers.$inferInsert;
export type GenerationParticipant = typeof generationParticipants.$inferSelect;
export type NewGenerationParticipant = typeof generationParticipants.$inferInsert;
export type GenerationParticipantRole =
  typeof generationParticipantRoles.$inferSelect;
export type NewGenerationParticipantRole =
  typeof generationParticipantRoles.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionCandidate = typeof submissionCandidates.$inferSelect;
export type NewSubmissionCandidate = typeof submissionCandidates.$inferInsert;
export type SubmissionMetadata = typeof submissionMetadata.$inferSelect;
export type NewSubmissionMetadata = typeof submissionMetadata.$inferInsert;

export type OrganizationMemberStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'INACTIVE';
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type StudyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type GenerationStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';
export type CycleStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'OPEN'
  | 'CLOSED'
  | 'COMPLETED'
  | 'CANCELLED';
export type IdentityProvider = 'DISCORD' | 'GITHUB';
export type GenerationParticipantStatus =
  | 'APPLIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'INACTIVE'
  | 'REMOVED';
export type GenerationParticipantRoleValue =
  | 'OWNER'
  | 'MANAGER'
  | 'PARTICIPANT'
  | 'OBSERVER';
