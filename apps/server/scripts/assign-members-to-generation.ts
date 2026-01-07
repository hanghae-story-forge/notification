import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { members, generationMembers, generations } from '../src/infrastructure/persistence/drizzle-db/schema';
import { eq, or, and } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// 기수에 멤버 할당
async function assignMembersToGeneration(generationId: number, githubUsernames: string[]) {
  // 기수 존재 확인
  const generation = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);

  if (generation.length === 0) {
    console.error(`❌ Generation with ID ${generationId} not found`);
    process.exit(1);
  }

  console.log(`📋 Assigning members to "${generation[0].name}" (ID: ${generationId})\n`);

  let successCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const github of githubUsernames) {
    // 멤버 조회
    const member = await db.select().from(members).where(eq(members.githubUsername, github)).limit(1);

    if (member.length === 0) {
      console.log(`  ⚠️  Member not found: @${github}`);
      notFoundCount++;
      continue;
    }

    // 이미 할당되어 있는지 확인
    const existing = await db
      .select()
      .from(generationMembers)
      .where(
        and(eq(generationMembers.generationId, generationId), eq(generationMembers.memberId, member[0].id))
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭️  Already assigned: @${github} (${member[0].name})`);
      skippedCount++;
      continue;
    }

    // 할당
    await db.insert(generationMembers).values({
      generationId,
      memberId: member[0].id,
    });

    console.log(`  ✅ Assigned: @${github} (${member[0].name})`);
    successCount++;
  }

  console.log(`\n✅ Done!`);
  console.log(`   - Assigned: ${successCount}`);
  console.log(`   - Skipped: ${skippedCount}`);
  console.log(`   - Not found: ${notFoundCount}`);
}

// 특정 기수의 멤버 목록 조회
async function listGenerationMembers(generationId: number) {
  const generation = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);

  if (generation.length === 0) {
    console.error(`❌ Generation with ID ${generationId} not found`);
    process.exit(1);
  }

  const members = await db
    .select({
      github: generationMembers.memberId,
    })
    .from(generationMembers)
    .where(eq(generationMembers.generationId, generationId));

  console.log(`\n📋 Members of "${generation[0].name}" (ID: ${generationId}):\n`);
  console.log(`Total: ${members.length} members\n`);

  for (const member of members) {
    console.log(`  - @${member.github}`);
  }
}

// 메인 실행
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: pnpm github:assign <generationId> <githubUser1,githubUser2,...>');
    console.log('   or: pnpm github:assign <generationId> --list (to list members)');
    console.log('\nAvailable generations:');
    const allGenerations = await db.select().from(generations);
    for (const gen of allGenerations) {
      console.log(`  - ${gen.name} (ID: ${gen.id})`);
    }
    process.exit(0);
  }

  const generationId = parseInt(args[0], 10);

  if (args[1] === '--list') {
    await listGenerationMembers(generationId);
  } else {
    const githubUsernames = args[1]?.split(',').map((s) => s.trim()) || [];
    if (githubUsernames.length === 0) {
      console.error('❌ No GitHub usernames provided');
      console.log('Usage: pnpm github:assign <generationId> <githubUser1,githubUser2,...>');
      process.exit(1);
    }
    await assignMembersToGeneration(generationId, githubUsernames);
  }

  await client.end();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
