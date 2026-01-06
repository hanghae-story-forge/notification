// Migration runner for multi-tenant support
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);

async function runMigration(direction: 'up' | 'down') {
  try {
    console.log('🔄 Starting migration: Add multi-tenant support (Safe)...');

    if (direction === 'up') {
      const migrationSQL = readFileSync(
        join(__dirname, '002_add_multi_tenant_support_safe.sql'),
        'utf-8'
      );

      // Split by semi-colon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await sql.unsafe(statement);
        }
      }

      console.log('✅ Migration completed successfully!');
      console.log('\n📝 Summary:');
      console.log('   - Created ENUM types (organization_member_status, organization_role)');
      console.log('   - Created organizations table');
      console.log('   - Added organizationId to generations');
      console.log('   - Updated members table for Discord auth');
      console.log('   - Created organization_members table');
      console.log('   - Migrated existing data to default organization');
    } else {
      console.log('⚠️  Rollback not implemented - please manually execute SQL');
      console.log('   See 001_down_multi_tenant_support.sql for reference');
    }

    console.log('\n✨ All done!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

const direction = (process.argv[2] as 'up' | 'down') || 'up';
runMigration(direction);
