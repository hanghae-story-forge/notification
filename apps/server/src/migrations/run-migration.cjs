const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const client = postgres(process.env.DATABASE_URL);

// Split SQL while preserving DO blocks
function splitSQL(sql) {
  const statements = [];
  let current = '';
  let depth = 0;
  let inDO = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Start of DO block
    if (trimmed.startsWith('DO $$')) {
      inDO = true;
      current += line + '\n';
      continue;
    }

    // End of DO block
    if (inDO && trimmed === '$$;') {
      current += line + '\n';
      statements.push(current.trim());
      current = '';
      inDO = false;
      continue;
    }

    // Inside DO block
    if (inDO) {
      current += line + '\n';
      continue;
    }

    // Regular statement
    current += line + '\n';

    // Check for semicolon outside DO block
    if (trimmed.endsWith(';') && !trimmed.startsWith('--')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Add remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
}

(async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '003_add_multi_tenant_support_compatible.sql'),
      'utf8'
    );

    const statements = splitSQL(sql);

    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await client.unsafe(stmt);
          console.log('✅ Executed:', stmt.substring(0, Math.min(60, stmt.length)) + '...');
        } catch (e) {
          console.error('❌ Failed statement:', stmt.substring(0, 300));
          throw e;
        }
      }
    }

    console.log('✅ Migration completed!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
