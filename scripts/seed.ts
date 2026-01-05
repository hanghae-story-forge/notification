import 'dotenv/config';
import { db } from '../src/lib/db';
import { members, generations, cycles } from '../src/db/schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. 기수 생성
  const [generation] = await db
    .insert(generations)
    .values({
      name: '똥글똥글 1기',
      startedAt: new Date('2024-09-28'),
      isActive: true,
    })
    .returning();

  console.log(`✅ Created generation: ${generation.name}`);

  // 2. 멤버 생성 (GitHub username으로)
  const membersData = [
    { github: 'user1', name: '홍길동', discordId: '123456789' },
    { github: 'user2', name: '김철수', discordId: '987654321' },
    { github: 'user3', name: '이영희', discordId: '456789123' },
  ];

  const insertedMembers = await db.insert(members).values(membersData).returning();
  console.log(`✅ Created ${insertedMembers.length} members`);

  // 3. 첫 번째 사이클 생성
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
  console.log('3. GET /api/status/1 로 제출 현황을 확인하세요');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
