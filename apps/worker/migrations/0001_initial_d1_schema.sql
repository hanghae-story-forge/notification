-- D1 schema for the full Cloudflare Worker migration.
-- Keep this schema Render/Postgres independent: SQLite-compatible types only.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  discord_webhook_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  default_cycle_count INTEGER NOT NULL DEFAULT 8,
  default_cycle_duration_days INTEGER NOT NULL DEFAULT 14,
  default_inactive_threshold_missed_cycles INTEGER NOT NULL DEFAULT 3,
  default_discord_channel_id TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS studies_org_slug_uidx ON studies(organization_id, slug);
CREATE INDEX IF NOT EXISTS studies_org_idx ON studies(organization_id);
CREATE INDEX IF NOT EXISTS studies_status_idx ON studies(status);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  github_username TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_node_id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  raw_profile TEXT NOT NULL DEFAULT '{}',
  is_primary INTEGER NOT NULL DEFAULT 1,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  unlinked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS member_identities_provider_user_uidx ON member_identities(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS member_identities_member_idx ON member_identities(member_id);
CREATE INDEX IF NOT EXISTS member_identities_provider_username_idx ON member_identities(provider, username);

CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  study_id INTEGER REFERENCES studies(id),
  ordinal INTEGER,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  planned_cycle_count INTEGER NOT NULL DEFAULT 8,
  cycle_duration_days INTEGER NOT NULL DEFAULT 14,
  inactive_threshold_missed_cycles INTEGER NOT NULL DEFAULT 3,
  discord_channel_id TEXT,
  github_project_id TEXT,
  github_project_number INTEGER,
  github_project_url TEXT,
  started_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  planned_at TEXT,
  activated_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS generations_org_idx ON generations(organization_id);
CREATE INDEX IF NOT EXISTS generations_study_idx ON generations(study_id);
CREATE INDEX IF NOT EXISTS generations_org_ordinal_idx ON generations(organization_id, ordinal);
CREATE INDEX IF NOT EXISTS generations_status_idx ON generations(status);

CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id INTEGER NOT NULL REFERENCES generations(id),
  week INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  title_override TEXT,
  github_issue_url TEXT,
  github_issue_id TEXT,
  github_issue_number INTEGER,
  github_project_item_id TEXT,
  opened_at TEXT,
  closed_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS cycles_generation_week_uidx ON cycles(generation_id, week);
CREATE INDEX IF NOT EXISTS cycles_generation_idx ON cycles(generation_id);
CREATE INDEX IF NOT EXISTS cycles_status_idx ON cycles(status);
CREATE INDEX IF NOT EXISTS cycles_date_range_idx ON cycles(start_date, end_date);

CREATE TABLE IF NOT EXISTS organization_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS org_members_org_member_idx ON organization_members(organization_id, member_id);
CREATE INDEX IF NOT EXISTS org_members_status_idx ON organization_members(status);

CREATE TABLE IF NOT EXISTS generation_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id INTEGER NOT NULL REFERENCES generations(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS gen_members_gen_member_idx ON generation_members(generation_id, member_id);

CREATE TABLE IF NOT EXISTS generation_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id INTEGER NOT NULL REFERENCES generations(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'APPLIED',
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  approved_by_member_id INTEGER REFERENCES members(id),
  rejected_at TEXT,
  rejected_by_member_id INTEGER REFERENCES members(id),
  rejected_reason TEXT,
  removed_at TEXT,
  removed_by_member_id INTEGER REFERENCES members(id),
  removed_reason TEXT,
  marked_inactive_at TEXT,
  inactive_reason TEXT,
  reactivated_at TEXT,
  reactivated_by_member_id INTEGER REFERENCES members(id),
  reactivated_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS generation_participants_generation_member_uidx ON generation_participants(generation_id, member_id);
CREATE INDEX IF NOT EXISTS generation_participants_status_idx ON generation_participants(status);

CREATE TABLE IF NOT EXISTS generation_participant_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_participant_id INTEGER NOT NULL REFERENCES generation_participants(id),
  role TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by_member_id INTEGER REFERENCES members(id),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS generation_participant_roles_role_idx ON generation_participant_roles(generation_participant_id, role);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL REFERENCES cycles(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  generation_participant_id INTEGER REFERENCES generation_participants(id),
  url TEXT NOT NULL,
  normalized_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACCEPTED',
  timing_status TEXT NOT NULL DEFAULT 'ON_TIME',
  accessibility_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_type TEXT NOT NULL DEFAULT 'GITHUB_ISSUE_COMMENT',
  source_github_comment_id TEXT,
  source_github_comment_url TEXT,
  source_github_issue_id TEXT,
  source_github_issue_number INTEGER,
  github_comment_id TEXT UNIQUE,
  invalid_reason TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS submissions_cycle_member_idx ON submissions(cycle_id, member_id);
CREATE INDEX IF NOT EXISTS submissions_participant_idx ON submissions(generation_participant_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status);

CREATE TABLE IF NOT EXISTS submission_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER REFERENCES cycles(id),
  generation_id INTEGER REFERENCES generations(id),
  external_provider TEXT NOT NULL,
  external_username TEXT NOT NULL,
  external_user_id TEXT,
  raw_comment_body TEXT NOT NULL,
  extracted_urls TEXT NOT NULL DEFAULT '[]',
  source_github_comment_id TEXT,
  source_github_comment_url TEXT,
  source_github_issue_id TEXT,
  source_github_issue_number INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING_IDENTITY_MAPPING',
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by_member_id INTEGER REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS submission_candidates_cycle_idx ON submission_candidates(cycle_id);
CREATE INDEX IF NOT EXISTS submission_candidates_status_idx ON submission_candidates(status);
CREATE INDEX IF NOT EXISTS submission_candidates_external_idx ON submission_candidates(external_provider, external_username);

CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'DISCORD',
  channel_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  external_message_id TEXT,
  sent_at TEXT,
  failed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
