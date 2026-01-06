import 'dotenv/config';
import { db } from '../src/infrastructure/lib/db';
import { members, generations, cycles, organizations, organizationMembers } from '../src/infrastructure/persistence/drizzle-db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. 조직 생성 (또는 기존 조직 조회)
  let [org] = await db.select().from(organizations).where(eq(organizations.slug, 'dongueldonguel'));

  if (!org) {
    [org] = await db.insert(organizations).values({
      name: '똥글똥글',
      slug: 'dongueldonguel',
      isActive: true,
    }).returning();
    console.log(`✅ Created organization: ${org.name}`);
  } else {
    console.log(`✅ Using existing organization: ${org.name}`);
  }

  // 2. 기수 생성 (organizationId 포함)
  const [generation] = await db
    .insert(generations)
    .values({
      name: '똥글똥글 1기',
      organizationId: org.id,
      startedAt: new Date('2024-09-28'),
      isActive: true,
    })
    .returning();

  console.log(`✅ Created generation: ${generation.name}`);

  // 3. 멤버 생성 (Discord ID 필수)
  const membersData = [
    { github: 'user1', name: '홍길동', discordId: '123456789' },
    { github: 'user2', name: '김철수', discordId: '987654321' },
    { github: 'user3', name: '이영희', discordId: '456789123' },
  ];

  const insertedMembers = await db.insert(members).values(membersData).returning();
  console.log(`✅ Created ${insertedMembers.length} members`);

  // 4. 조직 멤버로 등록
  for (const member of insertedMembers) {
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      memberId: member.id,
      role: 'MEMBER',
      status: 'APPROVED',
    }).onConflictDoNothing();
  }
  console.log(`✅ Added members to organization`);

  // 5. 첫 번째 사이클 생성
  const [cycle] = await db
    .insert(cycles)
    .values({
      generationId: generation.id,
      week: 1,
      startDate: new Date('2024-09-28T00:00:00'),
      endDate: new Date('2024-10-11T23:59:59'),
      githubIssueUrl: 'https://github.com/hanghae-story-forge/archive/issues/1',
    })
    .returning();

  console.log(`✅ Created cycle: Week ${cycle.week}`);
  console.log(`🔗 GitHub Issue URL: ${cycle.githubIssueUrl}`);

  console.log('✨ Seeding complete!');
  console.log('\n📝 Next steps:');
  console.log('1. GitHub 레포의 Issue에 댓글로 링크를 남겨보세요');
  console.log('2. Discord webhook이 알림을 보낼 것입니다');
  console.log('3. GET /api/status/1?organizationSlug=dongueldonguel 로 제출 현황을 확인하세요');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
