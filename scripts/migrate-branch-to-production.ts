/**
 * Neon DB Branch to Branch Migration Script
 *
 * This script migrates data from a source Neon DB branch (e.g., develop) to a target branch (e.g., production).
 * It handles the export/import of all tables while preserving referential integrity.
 *
 * Usage:
 *   SOURCE_DB_URL="postgresql://..." TARGET_DB_URL="postgresql://..." pnpm tsx scripts/migrate-branch-to-production.ts
 */

import postgres from 'postgres';
import * as schema from '../src/db/schema';

interface TableInfo {
  name: string;
  dependsOn: string[];
}

// Tables in dependency order (tables with no dependencies first)
const TABLES: TableInfo[] = [
  { name: 'members', dependsOn: [] },
  { name: 'generations', dependsOn: [] },
  { name: 'generation_members', dependsOn: ['members', 'generations'] },
  { name: 'cycles', dependsOn: ['generations'] },
  { name: 'submissions', dependsOn: ['cycles', 'members'] },
];

interface Row {
  [key: string]: any;
}

async function exportTable(sql: postgres.Sql<any>, tableName: string): Promise<Row[]> {
  console.log(`  📥 Exporting ${tableName}...`);
  const rows = await sql.unsafe<Row[]>(`SELECT * FROM "${tableName}"`);
  console.log(`     ✓ ${rows.length} rows from ${tableName}`);
  return rows;
}

async function clearTable(sql: postgres.Sql<any>, tableName: string): Promise<void> {
  console.log(`  🗑️  Clearing ${tableName}...`);
  // Use TRUNCATE with CASCADE to handle foreign keys
  // But we need to be careful about order, so DELETE in reverse dependency order
  await sql.unsafe(`DELETE FROM "${tableName}"`);
  console.log(`     ✓ Cleared ${tableName}`);
}

async function importTable(
  sql: postgres.Sql<any>,
  tableName: string,
  rows: Row[]
): Promise<void> {
  if (rows.length === 0) {
    console.log(`  ⏭️  Skipping ${tableName} (no data)`);
    return;
  }

  console.log(`  📤 Importing ${tableName}...`);

  // Reset sequence to avoid ID conflicts
  await sql.unsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) + 1 FROM "${tableName}"), 1), false)`
  );

  // Build column names and placeholders
  const columns = Object.keys(rows[0]);
  const columnList = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  // Insert all rows
  for (const row of rows) {
    const values = columns.map((col) => row[col]);
    await sql.unsafe(
      `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
      values
    );
  }

  console.log(`     ✓ ${rows.length} rows to ${tableName}`);
}

async function migrateData() {
  const sourceUrl = process.env.SOURCE_DB_URL;
  const targetUrl = process.env.TARGET_DB_URL;

  if (!sourceUrl || !targetUrl) {
    console.error('❌ SOURCE_DB_URL and TARGET_DB_URL environment variables are required');
    process.exit(1);
  }

  console.log('🚀 Starting Neon DB branch migration...\n');
  console.log(`Source: ${sourceUrl.replace(/:[^:]+@/, ':****@')}`);
  console.log(`Target: ${targetUrl.replace(/:[^:]+@/, ':****@')}\n`);

  const sourceSql = postgres(sourceUrl, { max: 1 });
  const targetSql = postgres(targetUrl, { max: 1 });

  try {
    // Verify connections
    console.log('🔗 Verifying database connections...');
    await sourceSql`SELECT 1`;
    await targetSql`SELECT 1`;
    console.log('   ✓ Both databases connected\n');

    // Export all data from source
    console.log('📦 Exporting data from source branch...');
    const exportedData = new Map<string, Row[]>();

    for (const table of TABLES) {
      const rows = await exportTable(sourceSql, table.name);
      exportedData.set(table.name, rows);
    }

    const totalRows = Array.from(exportedData.values()).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`\n   ✓ Exported ${totalRows} total rows\n`);

    // Clear target tables in reverse dependency order
    console.log('🗑️  Clearing target branch data...');
    const reversedTables = [...TABLES].reverse();
    for (const table of reversedTables) {
      await clearTable(targetSql, table.name);
    }
    console.log('\n');

    // Import data to target
    console.log('📤 Importing data to target branch...');
    for (const table of TABLES) {
      const rows = exportedData.get(table.name) || [];
      await importTable(targetSql, table.name, rows);
    }

    const importedRows = Array.from(exportedData.values()).reduce((sum, rows) => sum + rows.length, 0);
    console.log(`\n✅ Migration complete! ${importedRows} rows migrated.\n`);

    // Verify data
    console.log('🔍 Verifying imported data...');
    for (const table of TABLES) {
      const result = await targetSql.unsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "${table.name}"`
      );
      const count = Number(result[0].count);
      const originalCount = exportedData.get(table.name)?.length || 0;
      const status = count === originalCount ? '✓' : '❌';
      console.log(`   ${status} ${table.name}: ${count} rows (expected ${originalCount})`);
    }

  } finally {
    await sourceSql.end();
    await targetSql.end();
  }
}

migrateData().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
