-- Migration: Add Multi-Tenant Support
-- Description: Add organizations and organization_members tables, update members for Discord auth, add organizationId to generations
-- Date: 2025-01-06

-- ============================================================================
-- Step 1: Create ENUM types
-- ============================================================================

-- Organization member status enum
CREATE TYPE organization_member_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'INACTIVE'
);

-- Organization role enum
CREATE TYPE organization_role AS ENUM (
  'OWNER',
  'ADMIN',
  'MEMBER'
);

-- ============================================================================
-- Step 2: Create organizations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  discord_webhook_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON organizations(slug);

-- ============================================================================
-- Step 3: Add organizationId to generations table
-- ============================================================================

-- First add column as nullable
ALTER TABLE generations ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Add index for organization_id (will be used later)
CREATE INDEX IF NOT EXISTS generations_org_idx ON generations(organization_id);

-- ============================================================================
-- Step 4: Update members table for Discord authentication
-- ============================================================================

-- Make discordId required and unique
ALTER TABLE members ALTER COLUMN discord_id SET NOT NULL;
ALTER TABLE members ALTER COLUMN discord_id DROP CONSTRAINT IF EXISTS members_discord_id_key;
ALTER TABLE members ADD CONSTRAINT members_discord_id_key UNIQUE (discord_id);

-- Make github optional (drop unique constraint)
ALTER TABLE members ALTER COLUMN github DROP CONSTRAINT IF EXISTS members_github_unique;
ALTER TABLE members ALTER COLUMN github DROP NOT NULL;

-- Add new Discord-related columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS discord_avatar TEXT;

-- ============================================================================
-- Step 5: Create organization_members table
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  role organization_role NOT NULL,
  status organization_member_status NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Foreign keys
  CONSTRAINT org_members_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT org_members_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS org_members_org_member_idx ON organization_members(organization_id, member_id);
CREATE INDEX IF NOT EXISTS org_members_status_idx ON organization_members(status);

-- ============================================================================
-- Step 6: Migrate existing data
-- ============================================================================

-- Step 6.1: Create default "똥글똥글" organization
INSERT INTO organizations (name, slug, discord_webhook_url, is_active)
VALUES (
  '똥글똥글',
  'dongueldonguel',
  (SELECT discord_webhook_url FROM generations LIMIT 1), -- Use existing webhook if available
  true
)
ON CONFLICT (name) DO NOTHING
RETURNING id;

-- Get the organization ID (use a variable in application code)
-- For migration purposes, we'll use the first organization
DO $$
DECLARE
  default_org_id INTEGER;
BEGIN
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'dongueldonguel' LIMIT 1;

  -- Step 6.2: Update generations to belong to the default organization
  UPDATE generations
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;

  -- Step 6.3: Make organization_id NOT NULL after data migration
  ALTER TABLE generations ALTER COLUMN organization_id SET NOT NULL;

  -- Step 6.4: Migrate existing members to organization_members
  -- All existing members become APPROVED members of 똥글똥글
  INSERT INTO organization_members (organization_id, member_id, role, status, joined_at, updated_at)
  SELECT
    default_org_id,
    m.id,
    'MEMBER'::organization_role,
    'APPROVED'::organization_member_status,
    m.created_at,
    NOW()
  FROM members m
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Migration completed successfully';
END $$;

-- ============================================================================
-- Step 7: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE organizations IS '스터디 그룹/조직';
COMMENT ON TABLE organization_members IS '조직-멤버 관계 테이블 (generation_members를 대체)';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier for organization';
COMMENT ON COLUMN organization_members.status IS 'PENDING: 가입 대기, APPROVED: 승인됨, REJECTED: 거절됨, INACTIVE: 비활성화';
COMMENT ON COLUMN organization_members.role IS 'OWNER: 조직 생성자, ADMIN: 관리자, MEMBER: 일반 멤버';
COMMENT ON COLUMN members.discord_id IS 'Discord User ID (고유 식별자)';
COMMENT ON COLUMN members.discord_username IS 'Discord username (변경 가능)';
COMMENT ON COLUMN members.discord_avatar IS 'Discord avatar hash';

-- ============================================================================
-- ROLLBACK (for reference only - execute manually if needed)
-- ============================================================================

/*
-- Drop organization_members table
DROP TABLE IF EXISTS organization_members CASCADE;

-- Remove Discord columns from members
ALTER TABLE members DROP COLUMN IF EXISTS discord_username;
ALTER TABLE members DROP COLUMN IF EXISTS discord_avatar;

-- Revert members changes
ALTER TABLE members ALTER COLUMN github SET NOT NULL;
ALTER TABLE members ADD CONSTRAINT members_github_unique UNIQUE (github);
ALTER TABLE members ALTER COLUMN discord_id DROP CONSTRAINT members_discord_id_key;
ALTER TABLE members ALTER COLUMN discord_id DROP NOT NULL;

-- Remove organizationId from generations
ALTER TABLE generations DROP COLUMN IF EXISTS organization_id;
DROP INDEX IF EXISTS generations_org_idx;

-- Drop organizations table
DROP TABLE IF EXISTS organizations CASCADE;
DROP INDEX IF EXISTS organizations_slug_idx;

-- Drop ENUM types
DROP TYPE IF EXISTS organization_role CASCADE;
DROP TYPE IF EXISTS organization_member_status CASCADE;
*/
