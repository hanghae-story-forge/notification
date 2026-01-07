// Discord 커맨드 로직 테스트 스크립트
import 'dotenv/config';
import { GetCycleStatusQuery } from '../src/application/queries';
import { DrizzleCycleRepository } from '../src/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '../src/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleSubmissionRepository } from '../src/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '../src/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationRepository } from '../src/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleOrganizationMemberRepository } from '../src/infrastructure/persistence/drizzle/organization-member.repository.impl';

async function main() {
  const cycleRepo = new DrizzleCycleRepository();
  const generationRepo = new DrizzleGenerationRepository();
  const submissionRepo = new DrizzleSubmissionRepository();
  const memberRepo = new DrizzleMemberRepository();
  const organizationRepo = new DrizzleOrganizationRepository();
  const organizationMemberRepo = new DrizzleOrganizationMemberRepository();

  const getCycleStatusQuery = new GetCycleStatusQuery(
    cycleRepo,
    generationRepo,
    organizationRepo,
    submissionRepo,
    organizationMemberRepo,
    memberRepo
  );

  // 테스트 1: 특정 기수의 주차 목록 조회
  console.log('\n📅 테스트 1: 똥글똥글 1기 주차 목록');
  console.log('='.repeat(50));

  const organizationSlug = 'donguel-donguel';
  const generationName = '똥글똥글 1기';

  const organization = await organizationRepo.findBySlug(organizationSlug);
  if (!organization) {
    console.log('❌ 조직을 찾을 수 없습니다');
    return;
  }

  const generations = await generationRepo.findByOrganization(organization.id.value);
  const generation = generations.find((g) => g.name === generationName);
  if (!generation) {
    console.log('❌ 기수를 찾을 수 없습니다');
    return;
  }

  const cycles = await cycleRepo.findByGeneration(generation.id.value);
  console.log(`\n총 ${cycles.length}개의 주차:\n`);
  cycles.forEach((c) => {
    console.log(
      `  • ${c.week.toNumber()}주차: ${c.startDate.toLocaleDateString('ko-KR')} ~ ${c.endDate.toLocaleDateString('ko-KR')}`
    );
  });

  // 테스트 2: 특정 주차 제출 현황 조회
  console.log('\n\n📝 테스트 2: 똥글똥글 1기 8주차 제출 현황');
  console.log('='.repeat(50));

  const week = 8;
  const cycle = await cycleRepo.findByGenerationAndWeek(generation.id.value, week);

  if (!cycle) {
    console.log(`❌ ${week}주차를 찾을 수 없습니다`);
    return;
  }

  const status = await getCycleStatusQuery.getCycleParticipantNames(
    cycle.id.value,
    organizationSlug
  );

  if (!status) {
    console.log('❌ 제출 현황을 찾을 수 없습니다');
    return;
  }

  const now = new Date();
  const daysLeft = Math.ceil(
    (status.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  console.log(`\n📅 ${status.cycleName}\n`);
  console.log(`📝 제출자 (${status.submittedNames.length}명):`);
  if (status.submittedNames.length > 0) {
    status.submittedNames.forEach((name) => console.log(`   ✅ ${name}`));
  } else {
    console.log('   없음');
  }

  console.log(`\n⏳ 미제출자 (${status.notSubmittedNames.length}명):`);
  if (status.notSubmittedNames.length > 0) {
    status.notSubmittedNames.forEach((name) => console.log(`   ❌ ${name}`));
  } else {
    console.log('   없음');
  }

  console.log(`\n📅 마감일: ${status.endDate.toLocaleDateString('ko-KR')} (${
    daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? '오늘 마감' : '마감됨'
  })`);

  console.log('\n✅ 테스트 완료!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
