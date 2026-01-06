import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkTables() {
  try {
    // Check if members table exists and get its columns
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'members'
      ORDER BY ordinal_position
    `);
    
    console.log('Members table columns:');
    console.table(columns.rows);
    
    // Check existing constraints
    const constraints = await db.execute(sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'members'::regclass
    `);
    
    console.log('\nMembers table constraints:');
    console.table(constraints.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTables();
