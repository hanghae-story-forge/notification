-- Migration: Add Multi-Tenant Support (PostgreSQL compatible)
-- Description: Add organizations and organization_members tables, update members for Discord auth, add organizationId to generations
-- Date: 2025-01-06

-- ============================================================================
-- Step 1: Create ENUM types (compatible with older PostgreSQL)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_member_status') THEN
    CREATE TYPE organization_member_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_role') THEN
    CREATE TYPE organization_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS organizations_slug_idx ON organizations(slug);

-- ============================================================================
-- Step 3: Add organizationId to generations table
-- ============================================================================

ALTER TABLE generations ADD COLUMN IF NOT EXISTS organization_id INTEGER;
CREATE INDEX IF NOT EXISTS generations_org_idx ON generations(organization_id);

-- ============================================================================
-- Step 4: Update members table for Discord authentication
-- ============================================================================

-- Add new Discord-related columns first
ALTER TABLE members ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS discord_avatar TEXT;

-- For existing members with null discord_id, generate a placeholder
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM members WHERE discord_id IS NULL) THEN
    UPDATE members
    SET discord_id = 'placeholder_' || id::text
    WHERE discord_id IS NULL;
    RAISE NOTICE 'Updated null discord_id values with placeholders';
  END IF;
END $$;

-- Make discord_id unique (handle duplicates gracefully)
DO $$
BEGIN
  ALTER TABLE members ADD CONSTRAINT members_discord_id_key UNIQUE (discord_id);
EXCEPTION
  WHEN duplicate_table OR unique_violation THEN
    RAISE NOTICE 'Could not add unique constraint on discord_id (duplicates exist)';
END $$;

-- Make github optional
DO $$
BEGIN
  ALTER TABLE members DROP CONSTRAINT IF EXISTS members_github_unique;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'members'
    AND column_name = 'github'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE members ALTER COLUMN github DROP NOT NULL;
    RAISE NOTICE 'Made github column nullable';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not make github nullable: %', SQLERRM;
END $$;

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

  CONSTRAINT org_members_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT org_members_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS org_members_org_member_idx ON organization_members(organization_id, member_id);
CREATE INDEX IF NOT EXISTS org_members_status_idx ON organization_members(status);

-- ============================================================================
-- Step 6: Migrate existing data
-- ============================================================================

-- Step 6.1: Create default "똥글똥글" organization
INSERT INTO organizations (name, slug, discord_webhook_url, is_active)
VALUES ('똥글똥글', 'dongueldonguel', NULL, true)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug;

-- Step 6.2: Update generations to belong to the default organization
DO $$
DECLARE
  default_org_id INTEGER;
BEGIN
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'dongueldonguel' LIMIT 1;

  IF default_org_id IS NOT NULL THEN
    UPDATE generations
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    RAISE NOTICE 'Assigned generations to organization %', default_org_id;
  END IF;
END $$;

-- Step 6.3: Migrate existing members to organization_members
DO $$
DECLARE
  default_org_id INTEGER;
BEGIN
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'dongueldonguel' LIMIT 1;

  IF default_org_id IS NOT NULL THEN
    INSERT INTO organization_members (organization_id, member_id, role, status, joined_at, updated_at)
    SELECT
      default_org_id,
      m.id,
      'MEMBER'::organization_role,
      'APPROVED'::organization_member_status,
      COALESCE(m.created_at, NOW()),
      NOW()
    FROM members m
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.member_id = m.id AND om.organization_id = default_org_id
    );

    RAISE NOTICE 'Migrated members to organization_members';
  END IF;
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
