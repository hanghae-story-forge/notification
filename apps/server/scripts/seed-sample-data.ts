// 샘플 데이터 생성 스크립트
// Member → OrganizationMember (APPROVED) → GenerationMember

import 'dotenv/config';
import { Member } from '../src/domain/member/member.domain';
import { OrganizationMember, OrganizationRole, OrganizationMemberStatus } from '../src/domain/organization-member/organization-member.domain';
import { GenerationMember } from '../src/domain/generation-member/generation-member.domain';
import { DrizzleMemberRepository } from '../src/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationRepository } from '../src/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleOrganizationMemberRepository } from '../src/infrastructure/persistence/drizzle/organization-member.repository.impl';
import { DrizzleGenerationRepository } from '../src/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleGenerationMemberRepository } from '../src/infrastructure/persistence/drizzle/generation-member.repository.impl';

// 샘플 멤버 데이터
const sampleMembers = [
  {
    discordId: '123456789012345678',
    discordUsername: 'sondi_dev',
    name: '손디',
    githubUsername: 'sondi',
  },
  {
    discordId: '234567890123456789',
    discordUsername: 'kimcoder',
    name: '김코더',
    githubUsername: 'kimcoder',
  },
  {
    discordId: '345678901234567890',
    discordUsername: 'parkdev',
    name: '박개발',
    githubUsername: 'parkdev',
  },
  {
    discordId: '456789012345678901',
    discordUsername: 'leetester',
    name: '이테스터',
    githubUsername: 'leetester',
  },
  {
    discordId: '567890123456789012',
    discordUsername: 'jodesigner',
    name: '조디자이너',
    githubUsername: 'jodesigner',
  },
];

async function main() {
  console.log('🌱 Seeding sample data...\n');

  const memberRepo = new DrizzleMemberRepository();
  const organizationRepo = new DrizzleOrganizationRepository();
  const organizationMemberRepo = new DrizzleOrganizationMemberRepository();
  const generationRepo = new DrizzleGenerationRepository();
  const generationMemberRepo = new DrizzleGenerationMemberRepository();

  // 1. 똥글똥글 조직 찾기
  const organization = await organizationRepo.findBySlug('donguel-donguel');
  if (!organization) {
    console.error('❌ 똥글똥글 조직을 찾을 수 없습니다');
    return;
  }
  console.log(`✅ 조직: ${organization.name.value} (ID: ${organization.id.value})`);

  // 2. 똥글똥글 1기 찾기
  const generations = await generationRepo.findByOrganization(organization.id.value);
  const generation1 = generations.find((g) => g.name === '똥글똥글 1기');
  if (!generation1) {
    console.error('❌ 똥글똥글 1기를 찾을 수 없습니다');
    return;
  }
  console.log(`✅ 기수: ${generation1.name} (ID: ${generation1.id.value})\n`);

  // 3. 멤버 생성 및 조직 가입, 기수 참여
  const createdMembers: Member[] = [];

  for (let i = 0; i < sampleMembers.length; i++) {
    const sample = sampleMembers[i];
    console.log(`\n📝 ${i + 1}. ${sample.name} (${sample.discordUsername})`);

    // 멤버 생성
    const member = Member.create({
      discordId: sample.discordId,
      discordUsername: sample.discordUsername,
      name: sample.name,
      githubUsername: sample.githubUsername,
    });
    await memberRepo.save(member);
    createdMembers.push(member);
    console.log(`   ✅ Member 생성 (ID: ${member.id.value})`);

    // 조직원 생성 (첫 번째 멤버는 OWNER, 나머지는 MEMBER)
    const role = i === 0 ? OrganizationRole.OWNER : OrganizationRole.MEMBER;
    const organizationMember = OrganizationMember.create({
      organizationId: organization.id.value,
      memberId: member.id.value,
      role: role,
      status: OrganizationMemberStatus.APPROVED, // 바로 승인
    });
    await organizationMemberRepo.save(organizationMember);
    console.log(`   ✅ OrganizationMember 생성 (${role})`);

    // 기수원 생성 (1기 참여)
    const generationMember = GenerationMember.create({
      generationId: generation1.id.value,
      memberId: member.id.value,
    });
    await generationMemberRepo.save(generationMember);
    console.log(`   ✅ GenerationMember 생성 (1기 참여)`);
  }

  console.log('\n\n✅ 샘플 데이터 생성 완료!');
  console.log(`   - ${createdMembers.length}명의 멤버`);
  console.log(`   - 조직: ${organization.name.value}`);
  console.log(`   - 기수: ${generation1.name}`);
  console.log('\n📊 이제 /cycle-status 명령어로 제출 현황을 확인할 수 있습니다!');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
