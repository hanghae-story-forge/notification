// Migration Script: Add Multi-Tenant Support
// Usage: npx tsx src/migrations/migrate.ts

import { db } from '../infrastructure/lib/db';
import { sql } from 'drizzle-orm';
import {
  members,
  generations,
  organizations,
  organizationMembers,
} from '../infrastructure/persistence/drizzle-db/schema';

async function up() {
  console.log('🔄 Starting migration: Add multi-tenant support...\n');

  try {
    // Start transaction
    await db.transaction(async (tx) => {
      // 1. Create ENUM types
      console.log('1️⃣  Creating ENUM types...');
      await tx.execute(sql`
        DO $$ BEGIN
          CREATE TYPE organization_member_status AS ENUM (
            'PENDING',
            'APPROVED',
            'REJECTED',
            'INACTIVE'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await tx.execute(sql`
        DO $$ BEGIN
          CREATE TYPE organization_role AS ENUM (
            'OWNER',
            'ADMIN',
            'MEMBER'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('   ✅ ENUM types created\n');

      // 2. Create organizations table
      console.log('2️⃣  Creating organizations table...');
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS organizations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          discord_webhook_url TEXT,
          is_active BOOLEAN DEFAULT true NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS organizations_slug_idx ON organizations(slug);
      `);
      console.log('   ✅ Organizations table created\n');

      // 3. Add organizationId to generations
      console.log('3️⃣  Adding organizationId to generations...');
      await tx.execute(sql`
        ALTER TABLE generations ADD COLUMN IF NOT EXISTS organization_id INTEGER;
      `);
      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS generations_org_idx ON generations(organization_id);
      `);
      console.log('   ✅ organizationId added to generations\n');

      // 4. Update members for Discord auth
      console.log('4️⃣  Updating members table for Discord authentication...');

      // Make discordId unique and required
      const existingMembersWithDiscord = await tx
        .select({
          id: members.id,
          discordId: members.discordId,
        })
        .from(members)
        .where(sql`${members.discordId} IS NOT NULL`);

      if (existingMembersWithDiscord.length > 0) {
        await tx.execute(sql`
          ALTER TABLE members ALTER COLUMN discord_id SET NOT NULL;
        `);
        await tx.execute(sql`
          ALTER TABLE members ADD CONSTRAINT members_discord_id_key UNIQUE (discord_id);
        `);
        console.log(
          `   ✅ Made discordId unique for ${existingMembersWithDiscord.length} members`
        );
      } else {
        console.log(
          '   ⚠️  No members with discordId found - skipping unique constraint'
        );
      }

      // Make github optional
      await tx.execute(sql`
        ALTER TABLE members ALTER COLUMN github DROP NOT NULL;
      `);
      await tx.execute(sql`
        ALTER TABLE members ADD CONSTRAINT IF NOT EXISTS members_github_unique UNIQUE (github);
      `);
      // Then drop the unique constraint
      await tx.execute(sql`
        ALTER TABLE members DROP CONSTRAINT IF EXISTS members_github_unique;
      `);

      // Add Discord columns
      await tx.execute(sql`
        ALTER TABLE members ADD COLUMN IF NOT EXISTS discord_username TEXT;
      `);
      await tx.execute(sql`
        ALTER TABLE members ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
      `);
      console.log('   ✅ Members table updated for Discord auth\n');

      // 5. Create organization_members table
      console.log('5️⃣  Creating organization_members table...');
      await tx.execute(sql`
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
      `);
      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS org_members_org_member_idx ON organization_members(organization_id, member_id);
      `);
      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS org_members_status_idx ON organization_members(status);
      `);
      console.log('   ✅ Organization_members table created\n');

      // 6. Migrate existing data
      console.log('6️⃣  Migrating existing data...');

      // 6.1 Create default organization
      const existingOrgs = await tx.select().from(organizations);
      let defaultOrgId: number;

      if (existingOrgs.length === 0) {
        const [newOrg] = await tx
          .insert(organizations)
          .values({
            name: '똥글똥글',
            slug: 'dongueldonguel',
            discordWebhookUrl: null, // Will be configured later
            isActive: true,
          })
          .returning();
        defaultOrgId = newOrg.id;
        console.log(
          `   ✅ Created default organization: ${defaultOrgId} (똥글똥글)`
        );
      } else {
        defaultOrgId = existingOrgs[0].id;
        console.log(`   ℹ️  Using existing organization: ${defaultOrgId}`);
      }

      // 6.2 Update generations to belong to default organization
      await tx
        .update(generations)
        .set({ organizationId: defaultOrgId })
        .where(sql`${generations.organizationId} IS NULL`);
      console.log('   ✅ Generations migrated to default organization');

      // 6.3 Make organizationId NOT NULL
      await tx.execute(sql`
        ALTER TABLE generations ALTER COLUMN organization_id SET NOT NULL;
      `);

      // 6.4 Migrate members to organization_members
      const allMembers = await tx.select().from(members);
      let migratedCount = 0;

      for (const member of allMembers) {
        await tx.insert(organizationMembers).values({
          organizationId: defaultOrgId,
          memberId: member.id,
          role: 'MEMBER',
          status: 'APPROVED',
          joinedAt: member.createdAt,
          updatedAt: new Date(),
        });
        migratedCount++;
      }

      console.log(
        `   ✅ Migrated ${migratedCount} members to organization_members\n`
      );

      console.log('✨ Migration completed successfully!\n');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function down() {
  console.log('🔄 Rolling back migration: Remove multi-tenant support...\n');

  try {
    await db.transaction(async (tx) => {
      console.log('1️⃣  Dropping organization_members...');
      await tx.execute(sql`DROP TABLE IF EXISTS organization_members CASCADE`);
      console.log('   ✅ Dropped\n');

      console.log('2️⃣  Removing Discord columns from members...');
      await tx.execute(
        sql`ALTER TABLE members DROP COLUMN IF EXISTS discord_username`
      );
      await tx.execute(
        sql`ALTER TABLE members DROP COLUMN IF EXISTS discord_avatar`
      );
      console.log('   ✅ Removed\n');

      console.log('3️⃣  Reverting members to GitHub auth...');
      // Note: This is a simplified rollback - in production you'd want to be more careful
      await tx.execute(
        sql`ALTER TABLE members ADD CONSTRAINT IF NOT EXISTS members_github_unique UNIQUE (github)`
      );
      await tx.execute(
        sql`ALTER TABLE members ALTER COLUMN github SET NOT NULL`
      );
      await tx.execute(
        sql`ALTER TABLE members DROP CONSTRAINT IF EXISTS members_discord_id_key`
      );
      await tx.execute(
        sql`ALTER TABLE members ALTER COLUMN discord_id DROP NOT NULL`
      );
      console.log('   ✅ Reverted\n');

      console.log('4️⃣  Removing organizationId from generations...');
      await tx.execute(
        sql`ALTER TABLE generations DROP COLUMN IF EXISTS organization_id`
      );
      console.log('   ✅ Removed\n');

      console.log('5️⃣  Dropping organizations...');
      await tx.execute(sql`DROP TABLE IF EXISTS organizations CASCADE`);
      console.log('   ✅ Dropped\n');

      console.log('6️⃣  Dropping ENUM types...');
      await tx.execute(sql`DROP TYPE IF EXISTS organization_role CASCADE`);
      await tx.execute(
        sql`DROP TYPE IF EXISTS organization_member_status CASCADE`
      );
      console.log('   ✅ Dropped\n');

      console.log('✨ Rollback completed successfully!\n');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'up') {
  up();
} else if (command === 'down') {
  down();
} else {
  console.log('Usage: npx tsx src/migrations/migrate.ts [up|down]');
  process.exit(1);
}
