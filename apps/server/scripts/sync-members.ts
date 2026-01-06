import 'dotenv/config';
import { Octokit } from 'octokit';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { members, generationMembers, generations } from '../src/infrastructure/persistence/drizzle-db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../src/env';
import { getGitHubClient } from '../src/infrastructure/lib/github';

let octokit: Octokit;
let client: postgres.Sql<{}>;
let db: ReturnType<typeof drizzle>;

async function init() {
  octokit = await getGitHubClient();
  client = postgres(env.DATABASE_URL);
  db = drizzle(client);
}

interface GitHubMember {
  login: string;
  name: string | null;
}

// 조직 멤버 목록 가져오기
async function getOrganizationMembers(org: string): Promise<GitHubMember[]> {
  console.log(`🔍 Fetching members for @${org}...\n`);

  const members: GitHubMember[] = [];

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await octokit.rest.orgs.listMembers({
        org,
        per_page: 100,
        page,
      });

      if (response.data.length === 0) {
        hasMore = false;
        break;
      }

      for (const member of response.data) {
        try {
          const userResponse = await octokit.rest.users.getByUsername({
            username: member.login,
          });

          members.push({
            login: userResponse.data.login,
            name: userResponse.data.name || userResponse.data.login, // 이름이 없으면 로그인 사용
          });
        } catch (error) {
          members.push({
            login: member.login,
            name: member.login,
          });
        }
      }

      page++;
    }

    return members;
  } catch (error) {
    console.error('❌ Error fetching organization members:', error);
    throw error;
  }
}

// 멤버 생성 또는 조회
async function getOrCreateMember(github: string, name: string) {
  const existing = await db.select().from(members).where(eq(members.github, github)).limit(1);

  if (existing.length > 0) {
    // 이름이 변경되었으면 업데이트
    if (existing[0].name !== name) {
      await db.update(members).set({ name }).where(eq(members.id, existing[0].id));
    }
    return existing[0];
  }

  // Discord ID가 필수이므로 placeholder 사용 (GitHub username 기반)
  const discordId = `gh_${github}`;

  const newMember = await db
    .insert(members)
    .values({
      github,
      name,
      discordId,
    })
    .returning();

  console.log(`  ✅ Created member: ${github} (${name})`);
  return newMember[0];
}

// 기수에 멤버 추가
async function addMemberToGeneration(generationId: number, memberId: number) {
  const existing = await db
    .select()
    .from(generationMembers)
    .where(
      eq(generationMembers.generationId, generationId) && eq(generationMembers.memberId, memberId)
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const newGenMember = await db
    .insert(generationMembers)
    .values({
      generationId,
      memberId,
    })
    .returning();

  return newGenMember[0];
}

// 메인 실행
async function main() {
  await init();
  const githubMembers = await getOrganizationMembers('hanghae-story-forge');
  console.log(`✅ Found ${githubMembers.length} members\n`);

  // 기수 목록 가져오기
  const allGenerations = await db.select().from(generations);

  if (allGenerations.length === 0) {
    console.error('❌ No generations found. Please run `pnpm github:sync` first.');
    process.exit(1);
  }

  console.log(`📋 Found ${allGenerations.length} generations:\n`);
  for (const gen of allGenerations) {
    console.log(`  - ${gen.name} (ID: ${gen.id})`);
  }

  console.log('\n🔄 Syncing members...\n');

  for (const githubMember of githubMembers) {
    const member = await getOrCreateMember(githubMember.login, githubMember.name ?? githubMember.login);
    console.log(`  👤 ${member.github} - ${member.name} (ID: ${member.id})`);
  }

  console.log('\n✅ Member sync complete!');
  console.log('\n💡 To assign members to generations, use the assign script:');
  console.log('   pnpm github:assign <generationId> <githubUser1,githubUser2,...>');

  await client.end();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
