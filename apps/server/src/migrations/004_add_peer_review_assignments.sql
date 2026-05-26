-- Peer review assignments for Donguel-Donguel random short reactions
-- Adds cycle-level review settings and per-reviewer assignment state.

DO $$ BEGIN
  CREATE TYPE peer_review_assignment_status AS ENUM (
    'ASSIGNED',
    'COMPLETED',
    'SKIPPED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS cycle_review_settings (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES cycles(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  assignment_seed TEXT NOT NULL,
  min_submission_count INTEGER NOT NULL DEFAULT 2,
  created_by_member_id INTEGER REFERENCES members(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cycle_review_settings_cycle_uidx
  ON cycle_review_settings(cycle_id);

CREATE TABLE IF NOT EXISTS peer_review_assignments (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES cycles(id),
  reviewer_member_id INTEGER NOT NULL REFERENCES members(id),
  reviewee_member_id INTEGER NOT NULL REFERENCES members(id),
  submission_id INTEGER NOT NULL REFERENCES submissions(id),
  status peer_review_assignment_status NOT NULL DEFAULT 'ASSIGNED',
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  completed_source_url TEXT,
  completion_note TEXT,
  skipped_at TIMESTAMP,
  skip_reason TEXT,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS peer_review_assignments_cycle_reviewer_uidx
  ON peer_review_assignments(cycle_id, reviewer_member_id);

CREATE UNIQUE INDEX IF NOT EXISTS peer_review_assignments_cycle_reviewee_uidx
  ON peer_review_assignments(cycle_id, reviewee_member_id);

CREATE INDEX IF NOT EXISTS peer_review_assignments_cycle_status_idx
  ON peer_review_assignments(cycle_id, status);
