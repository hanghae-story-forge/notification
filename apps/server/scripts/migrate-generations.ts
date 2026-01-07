import 'dotenv/config';
import { db } from '../src/infrastructure/lib/db';
import { generations, organizations } from '../src/infrastructure/persistence/drizzle-db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  // 1. 똥글똥글 조직 찾기
  const donguelOrg = await db
    .select()
    .from(organizations)
    .where(sql`${organizations.slug} = 'donguel-donguel'`)
    .limit(1);

  if (donguelOrg.length === 0) {
    console.error('❌ 똥글똥글 조직을 찾을 수 없습니다.');
    process.exit(1);
  }

  const orgId = donguelOrg[0].id;
  console.log(`✅ 똥글똥글 조직 ID: ${orgId}`);

  // 2. organization_id 컬럼 추가 (nullable로 먼저 추가)
  console.log('🔄 Adding organization_id column to generations table...');
  await db.execute(sql`
    ALTER TABLE generations
    ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id)
  `);
  console.log('✅ Column added');

  // 3. 기존 generations 데이터를 똥글똥글 조직에 연결
  console.log('🔄 Linking existing generations to donguel-donguel organization...');
  await db.execute(sql`
    UPDATE generations
    SET organization_id = ${orgId}
    WHERE organization_id IS NULL
  `);
  console.log(`✅ Updated generations linked to organization`);

  // 4. 이제 NOT NULL 제약조건 추가
  console.log('🔄 Adding NOT NULL constraint...');
  await db.execute(sql`
    ALTER TABLE generations
    ALTER COLUMN organization_id SET NOT NULL
  `);
  console.log('✅ NOT NULL constraint added');

  console.log('\n✅ Migration complete!');
  process.exit(0);
}

main().catch(console.error);
