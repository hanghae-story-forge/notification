// 샘플 데이터 생성 스크립트 (SQL 직접 사용)
import 'dotenv/config';
import { db } from '../src/infrastructure/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🌱 Seeding sample data...\n');

  // 1. 똥글똥글 조직 ID 찾기
  const orgResult = await db.execute(sql`
    SELECT id, name FROM organizations WHERE slug = 'donguel-donguel'
  `);
  const organization = orgResult[0];
  if (!organization) {
    console.error('❌ 똥글똥글 조직을 찾을 수 없습니다');
    return;
  }
  console.log(`✅ 조직: ${organization.name} (ID: ${organization.id})`);

  // 2. 똥글똥글 1기 ID 찾기
  const genResult = await db.execute(sql`
    SELECT id, name FROM generations WHERE name = '똥글똥글 1기' AND organization_id = ${organization.id}
  `);
  const generation = genResult[0];
  if (!generation) {
    console.error('❌ 똥글똥글 1기를 찾을 수 없습니다');
    return;
  }
  console.log(`✅ 기수: ${generation.name} (ID: ${generation.id})`);

  // 샘플 멤버 데이터
  const sampleMembers = [
    {
      discordId: '123456789012345678',
      discordUsername: 'sondi_dev',
      name: '손디',
      githubUsername: 'sondi',
      role: 'OWNER',
    },
    {
      discordId: '234567890123456789',
      discordUsername: 'kimcoder',
      name: '김코더',
      githubUsername: 'kimcoder',
      role: 'MEMBER',
    },
    {
      discordId: '345678901234567890',
      discordUsername: 'parkdev',
      name: '박개발',
      githubUsername: 'parkdev',
      role: 'MEMBER',
    },
    {
      discordId: '456789012345678901',
      discordUsername: 'leetester',
      name: '이테스터',
      githubUsername: 'leetester',
      role: 'MEMBER',
    },
    {
      discordId: '567890123456789012',
      discordUsername: 'jodesigner',
      name: '조디자이너',
      githubUsername: 'jodesigner',
      role: 'MEMBER',
    },
  ];

  // 3. 멤버, 조직원, 기수원 생성
  for (let i = 0; i < sampleMembers.length; i++) {
    const sample = sampleMembers[i];
    console.log(`\n📝 ${i + 1}. ${sample.name} (${sample.discordUsername})`);

    // 멤버 생성 (RETURNING으로 ID 받기)
    const memberResult = await db.execute(sql`
      INSERT INTO members (discord_id, discord_username, name, github_username)
      VALUES (${sample.discordId}, ${sample.discordUsername}, ${sample.name}, ${sample.githubUsername})
      ON CONFLICT (discord_id) DO NOTHING
      RETURNING id
    `);

    let memberId: number;
    if (memberResult.length > 0 && memberResult[0].id) {
      memberId = memberResult[0].id as number;
      console.log(`   ✅ Member 생성 (ID: ${memberId})`);
    } else {
      // 이미 존재하는 경우 ID 조회
      const existingResult = await db.execute(sql`
        SELECT id FROM members WHERE discord_id = ${sample.discordId}
      `);
      memberId = existingResult[0].id as number;
      console.log(`   ℹ️  Member 이미 존재 (ID: ${memberId})`);
    }

    // 조직원 생성 (먼저 존재하는지 확인)
    const existingOrgMember = await db.execute(sql`
      SELECT id FROM organization_members
      WHERE organization_id = ${organization.id} AND member_id = ${memberId}
    `);

    if (existingOrgMember.length === 0) {
      await db.execute(sql`
        INSERT INTO organization_members (organization_id, member_id, role, status)
        VALUES (${organization.id}, ${memberId}, ${sample.role}, 'APPROVED')
      `);
      console.log(`   ✅ OrganizationMember 생성 (${sample.role})`);
    } else {
      console.log(`   ℹ️  OrganizationMember 이미 존재`);
    }

    // 기수원 생성 (먼저 존재하는지 확인)
    const existingGenMember = await db.execute(sql`
      SELECT id FROM generation_members
      WHERE generation_id = ${generation.id} AND member_id = ${memberId}
    `);

    if (existingGenMember.length === 0) {
      await db.execute(sql`
        INSERT INTO generation_members (generation_id, member_id)
        VALUES (${generation.id}, ${memberId})
      `);
      console.log(`   ✅ GenerationMember 생성 (1기 참여)`);
    } else {
      console.log(`   ℹ️  GenerationMember 이미 존재`);
    }
  }

  console.log('\n\n✅ 샘플 데이터 생성 완료!');
  console.log(`   - ${sampleMembers.length}명의 멤버`);
  console.log(`   - 조직: ${organization.name}`);
  console.log(`   - 기수: ${generation.name}`);
  console.log('\n📊 이제 /cycle-status 명령어로 제출 현황을 확인할 수 있습니다!');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
