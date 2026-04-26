CREATE TYPE "public"."cycle_status" AS ENUM('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."drift_status" AS ENUM('DETECTED', 'NOTIFIED', 'RESOLVED', 'IGNORED');--> statement-breakpoint
CREATE TYPE "public"."generation_participant_role" AS ENUM('OWNER', 'MANAGER', 'PARTICIPANT', 'OBSERVER');--> statement-breakpoint
CREATE TYPE "public"."generation_participant_status" AS ENUM('APPLIED', 'APPROVED', 'REJECTED', 'INACTIVE', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('DISCORD', 'GITHUB');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('GITHUB', 'DISCORD');--> statement-breakpoint
CREATE TYPE "public"."obligation_status" AS ENUM('REQUIRED', 'EXEMPT_INACTIVE', 'EXEMPT_REMOVED', 'EXEMPT_NON_PARTICIPANT_ROLE');--> statement-breakpoint
CREATE TYPE "public"."organization_member_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD');--> statement-breakpoint
CREATE TYPE "public"."participant_cycle_result_status" AS ENUM('SUBMITTED_ON_TIME', 'SUBMITTED_LATE', 'MISSED', 'EXEMPT');--> statement-breakpoint
CREATE TYPE "public"."study_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."submission_candidate_status" AS ENUM('PENDING_IDENTITY_MAPPING', 'RESOLVED', 'IGNORED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('PENDING_IDENTITY_MAPPING', 'PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'INVALID');--> statement-breakpoint
CREATE TYPE "public"."submission_timing_status" AS ENUM('ON_TIME', 'LATE_PENDING_APPROVAL', 'LATE_APPROVED', 'LATE_REJECTED');--> statement-breakpoint
CREATE TYPE "public"."url_accessibility_status" AS ENUM('UNKNOWN', 'CHECKING', 'ACCESSIBLE', 'INACCESSIBLE', 'NEEDS_MANUAL_REVIEW');--> statement-breakpoint
CREATE TABLE "cycle_obligations" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"generation_participant_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"obligation_status" "obligation_status" DEFAULT 'REQUIRED' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_submission_stats" (
	"cycle_id" integer PRIMARY KEY NOT NULL,
	"required_participant_count" integer DEFAULT 0 NOT NULL,
	"submitted_participant_count" integer DEFAULT 0 NOT NULL,
	"on_time_submitted_participant_count" integer DEFAULT 0 NOT NULL,
	"late_submitted_participant_count" integer DEFAULT 0 NOT NULL,
	"accepted_submission_count" integer DEFAULT 0 NOT NULL,
	"on_time_submission_count" integer DEFAULT 0 NOT NULL,
	"late_approved_submission_count" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"generation_id" integer NOT NULL,
	"week" integer NOT NULL,
	"status" "cycle_status" DEFAULT 'SCHEDULED' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"title_override" text,
	"github_issue_url" text,
	"github_issue_id" text,
	"github_issue_number" integer,
	"github_project_item_id" text,
	"opened_at" timestamp,
	"closed_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"generation_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_participant_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"generation_participant_id" integer NOT NULL,
	"role" "generation_participant_role" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by_member_id" integer,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "generation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"generation_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"status" "generation_participant_status" DEFAULT 'APPLIED' NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"approved_by_member_id" integer,
	"rejected_at" timestamp,
	"rejected_by_member_id" integer,
	"rejected_reason" text,
	"removed_at" timestamp,
	"removed_by_member_id" integer,
	"removed_reason" text,
	"marked_inactive_at" timestamp,
	"inactive_reason" text,
	"reactivated_at" timestamp,
	"reactivated_by_member_id" integer,
	"reactivated_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"study_id" integer,
	"ordinal" integer,
	"name" text NOT NULL,
	"status" "generation_status" DEFAULT 'ACTIVE' NOT NULL,
	"planned_cycle_count" integer DEFAULT 8 NOT NULL,
	"cycle_duration_days" integer DEFAULT 14 NOT NULL,
	"inactive_threshold_missed_cycles" integer DEFAULT 3 NOT NULL,
	"discord_channel_id" text,
	"github_project_id" text,
	"github_project_number" integer,
	"github_project_url" text,
	"started_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"planned_at" timestamp,
	"activated_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_drift_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "integration_provider" DEFAULT 'GITHUB' NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"local_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"remote_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "drift_status" DEFAULT 'DETECTED' NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp,
	"resolved_at" timestamp,
	"resolved_by_member_id" integer
);
--> statement-breakpoint
CREATE TABLE "member_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"provider_node_id" text,
	"username" text,
	"display_name" text,
	"avatar_url" text,
	"raw_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"unlinked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"discord_username" text,
	"discord_avatar" text,
	"github_username" text,
	"name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "integration_provider" DEFAULT 'DISCORD' NOT NULL,
	"channel_id" text NOT NULL,
	"message_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_message_id" text,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"role" "organization_role" NOT NULL,
	"status" "organization_member_status" NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"discord_webhook_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_unique" UNIQUE("name"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "outbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_activity_stats" (
	"generation_participant_id" integer PRIMARY KEY NOT NULL,
	"total_required_cycles" integer DEFAULT 0 NOT NULL,
	"submitted_cycles" integer DEFAULT 0 NOT NULL,
	"missed_cycles" integer DEFAULT 0 NOT NULL,
	"consecutive_missed_cycles" integer DEFAULT 0 NOT NULL,
	"last_submitted_cycle_id" integer,
	"last_missed_cycle_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_cycle_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"generation_participant_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"obligation_status" "obligation_status" NOT NULL,
	"result_status" "participant_cycle_result_status" NOT NULL,
	"accepted_submission_count" integer DEFAULT 0 NOT NULL,
	"on_time_submission_count" integer DEFAULT 0 NOT NULL,
	"late_approved_submission_count" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "study_status" DEFAULT 'ACTIVE' NOT NULL,
	"default_cycle_count" integer DEFAULT 8 NOT NULL,
	"default_cycle_duration_days" integer DEFAULT 14 NOT NULL,
	"default_inactive_threshold_missed_cycles" integer DEFAULT 3 NOT NULL,
	"default_discord_channel_id" text,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "submission_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer,
	"generation_id" integer,
	"external_provider" "integration_provider" NOT NULL,
	"external_username" text NOT NULL,
	"external_user_id" text,
	"raw_comment_body" text NOT NULL,
	"extracted_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_github_comment_id" text,
	"source_github_comment_url" text,
	"source_github_issue_id" text,
	"source_github_issue_number" integer,
	"status" "submission_candidate_status" DEFAULT 'PENDING_IDENTITY_MAPPING' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_member_id" integer
);
--> statement-breakpoint
CREATE TABLE "submission_metadata" (
	"submission_id" integer PRIMARY KEY NOT NULL,
	"resolved_url" text,
	"canonical_url" text,
	"domain" text,
	"title" text,
	"description" text,
	"site_name" text,
	"image_url" text,
	"favicon_url" text,
	"content_type" text,
	"http_status" integer,
	"fetch_status" text DEFAULT 'PENDING' NOT NULL,
	"fetch_error" text,
	"fetched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"generation_participant_id" integer,
	"url" text NOT NULL,
	"normalized_url" text,
	"status" "submission_status" DEFAULT 'ACCEPTED' NOT NULL,
	"timing_status" "submission_timing_status" DEFAULT 'ON_TIME' NOT NULL,
	"accessibility_status" "url_accessibility_status" DEFAULT 'UNKNOWN' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"source_type" text DEFAULT 'GITHUB_ISSUE_COMMENT' NOT NULL,
	"source_github_comment_id" text,
	"source_github_comment_url" text,
	"source_github_issue_id" text,
	"source_github_issue_number" integer,
	"github_comment_id" text,
	"invalid_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_github_comment_id_unique" UNIQUE("github_comment_id")
);
--> statement-breakpoint
ALTER TABLE "cycle_obligations" ADD CONSTRAINT "cycle_obligations_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_obligations" ADD CONSTRAINT "cycle_obligations_generation_participant_id_generation_participants_id_fk" FOREIGN KEY ("generation_participant_id") REFERENCES "public"."generation_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_obligations" ADD CONSTRAINT "cycle_obligations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_submission_stats" ADD CONSTRAINT "cycle_submission_stats_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_members" ADD CONSTRAINT "generation_members_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_members" ADD CONSTRAINT "generation_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participant_roles" ADD CONSTRAINT "generation_participant_roles_generation_participant_id_generation_participants_id_fk" FOREIGN KEY ("generation_participant_id") REFERENCES "public"."generation_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participant_roles" ADD CONSTRAINT "generation_participant_roles_assigned_by_member_id_members_id_fk" FOREIGN KEY ("assigned_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participants" ADD CONSTRAINT "generation_participants_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participants" ADD CONSTRAINT "generation_participants_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participants" ADD CONSTRAINT "generation_participants_approved_by_member_id_members_id_fk" FOREIGN KEY ("approved_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participants" ADD CONSTRAINT "generation_participants_rejected_by_member_id_members_id_fk" FOREIGN KEY ("rejected_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participants" ADD CONSTRAINT "generation_participants_removed_by_member_id_members_id_fk" FOREIGN KEY ("removed_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_participants" ADD CONSTRAINT "generation_participants_reactivated_by_member_id_members_id_fk" FOREIGN KEY ("reactivated_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_drift_logs" ADD CONSTRAINT "github_drift_logs_resolved_by_member_id_members_id_fk" FOREIGN KEY ("resolved_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_identities" ADD CONSTRAINT "member_identities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_activity_stats" ADD CONSTRAINT "participant_activity_stats_generation_participant_id_generation_participants_id_fk" FOREIGN KEY ("generation_participant_id") REFERENCES "public"."generation_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_activity_stats" ADD CONSTRAINT "participant_activity_stats_last_submitted_cycle_id_cycles_id_fk" FOREIGN KEY ("last_submitted_cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_activity_stats" ADD CONSTRAINT "participant_activity_stats_last_missed_cycle_id_cycles_id_fk" FOREIGN KEY ("last_missed_cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_cycle_results" ADD CONSTRAINT "participant_cycle_results_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_cycle_results" ADD CONSTRAINT "participant_cycle_results_generation_participant_id_generation_participants_id_fk" FOREIGN KEY ("generation_participant_id") REFERENCES "public"."generation_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_cycle_results" ADD CONSTRAINT "participant_cycle_results_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studies" ADD CONSTRAINT "studies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_candidates" ADD CONSTRAINT "submission_candidates_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_candidates" ADD CONSTRAINT "submission_candidates_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_candidates" ADD CONSTRAINT "submission_candidates_resolved_by_member_id_members_id_fk" FOREIGN KEY ("resolved_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_metadata" ADD CONSTRAINT "submission_metadata_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_generation_participant_id_generation_participants_id_fk" FOREIGN KEY ("generation_participant_id") REFERENCES "public"."generation_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_obligations_cycle_participant_uidx" ON "cycle_obligations" USING btree ("cycle_id","generation_participant_id");--> statement-breakpoint
CREATE INDEX "cycles_generation_idx" ON "cycles" USING btree ("generation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cycles_generation_week_uidx" ON "cycles" USING btree ("generation_id","week");--> statement-breakpoint
CREATE INDEX "cycles_status_idx" ON "cycles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cycles_date_range_idx" ON "cycles" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "domain_events_aggregate_idx" ON "domain_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "domain_events_event_type_idx" ON "domain_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "gen_members_gen_member_idx" ON "generation_members" USING btree ("generation_id","member_id");--> statement-breakpoint
CREATE INDEX "generation_participant_roles_role_idx" ON "generation_participant_roles" USING btree ("generation_participant_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_participants_generation_member_uidx" ON "generation_participants" USING btree ("generation_id","member_id");--> statement-breakpoint
CREATE INDEX "generation_participants_status_idx" ON "generation_participants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generations_org_idx" ON "generations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "generations_study_idx" ON "generations" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "generations_org_ordinal_idx" ON "generations" USING btree ("organization_id","ordinal");--> statement-breakpoint
CREATE INDEX "generations_status_idx" ON "generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "github_drift_logs_resource_idx" ON "github_drift_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "github_drift_logs_status_idx" ON "github_drift_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_identities_member_idx" ON "member_identities" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_identities_provider_user_uidx" ON "member_identities" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "member_identities_provider_username_idx" ON "member_identities" USING btree ("provider","username");--> statement-breakpoint
CREATE INDEX "org_members_org_member_idx" ON "organization_members" USING btree ("organization_id","member_id");--> statement-breakpoint
CREATE INDEX "org_members_status_idx" ON "organization_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "outbox_messages_status_available_idx" ON "outbox_messages" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_cycle_results_cycle_participant_uidx" ON "participant_cycle_results" USING btree ("cycle_id","generation_participant_id");--> statement-breakpoint
CREATE INDEX "studies_org_idx" ON "studies" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "studies_org_slug_uidx" ON "studies" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "studies_status_idx" ON "studies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submission_candidates_cycle_idx" ON "submission_candidates" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "submission_candidates_status_idx" ON "submission_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submission_candidates_external_idx" ON "submission_candidates" USING btree ("external_provider","external_username");--> statement-breakpoint
CREATE INDEX "submissions_cycle_member_idx" ON "submissions" USING btree ("cycle_id","member_id");--> statement-breakpoint
CREATE INDEX "submissions_participant_idx" ON "submissions" USING btree ("generation_participant_id");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");