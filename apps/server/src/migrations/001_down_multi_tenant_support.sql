-- Rollback: Remove Multi-Tenant Support
-- Description: Rollback multi-tenant changes
-- Date: 2025-01-06

-- ============================================================================
-- WARNING: This will DELETE data!
-- Make sure to backup before running
-- ============================================================================

-- ============================================================================
-- Step 1: Drop organization_members table
-- ============================================================================

DROP TABLE IF EXISTS organization_members CASCADE;
DROP INDEX IF EXISTS org_members_org_member_idx;
DROP INDEX IF EXISTS org_members_status_idx;

-- ============================================================================
-- Step 2: Remove Discord-related columns from members
-- ============================================================================

ALTER TABLE members DROP COLUMN IF EXISTS discord_username;
ALTER TABLE members DROP COLUMN IF EXISTS discord_avatar;

-- ============================================================================
-- Step 3: Revert members table to original state (GitHub-based)
-- ============================================================================

-- Make github required and unique again
ALTER TABLE members ADD CONSTRAINT IF NOT EXISTS members_github_unique UNIQUE (github);
ALTER TABLE members ALTER COLUMN github SET NOT NULL;

-- Make discordId optional (remove unique constraint)
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_discord_id_key;
ALTER TABLE members ALTER COLUMN discord_id DROP NOT NULL;

-- ============================================================================
-- Step 4: Remove organizationId from generations
-- ============================================================================

ALTER TABLE generations DROP COLUMN IF EXISTS organization_id;
DROP INDEX IF EXISTS generations_org_idx;

-- ============================================================================
-- Step 5: Drop organizations table
-- ============================================================================

DROP TABLE IF EXISTS organizations CASCADE;
DROP INDEX IF EXISTS organizations_slug_idx;

-- ============================================================================
-- Step 6: Drop ENUM types
-- ============================================================================

DROP TYPE IF EXISTS organization_role CASCADE;
DROP TYPE IF EXISTS organization_member_status CASCADE;

-- ============================================================================
-- Completion notice
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback completed successfully';
END $$;
