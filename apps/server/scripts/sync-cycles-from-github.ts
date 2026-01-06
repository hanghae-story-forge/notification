import 'dotenv/config';
import { Octokit } from 'octokit';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { generations, cycles, organizations } from '../src/infrastructure/persistence/drizzle-db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '../src/env';
import { getGitHubClient } from '../src/infrastructure/lib/github';

let octokit: Octokit;
let client: postgres.Sql<{}>;
let db: ReturnType<typeof drizzle>;

async function initGitHub() {
  octokit = await getGitHubClient();
  client = postgres(env.DATABASE_URL);
  db = drizzle(client);
}

interface ProjectItem {
  id: string;
  content: {
    title: string;
    url: string;
    number: number;
  };
}

interface CycleData {
  week: number;
  startDate: Date;
  endDate: Date;
  githubIssueUrl: string;
}

// Issue title에서 회차 정보 파싱: "1회차(02월 02일 ~ 02월 15일)" 또는 "1회차(9월 28일 ~ 10월 11일)"
function parseCycleTitle(title: string): CycleData | null {
  // 공백 유무 패턴 모두 지원
  const regex = /(\d+)회차\((\d{1,2})월\s*(\d{1,2})일\s*~\s*(\d{1,2})월\s*(\d{1,2})일\)/;
  const match = title.match(regex);

  if (!match) {
    console.warn(`  ⚠️  Cannot parse title: ${title}`);
    return null;
  }

  const [, week, startMonth, startDay, endMonth, endDay] = match;

  // 연도는 현재 연도로 가정 (필요시 조정)
  const currentYear = new Date().getFullYear();

  // KST 00:00:00 기준으로 UTC 변환
  const startDate = new Date(`${currentYear}-${startMonth}-${startDay}T00:00:00+09:00`);
  const endDate = new Date(`${currentYear}-${endMonth}-${endDay}T23:59:59+09:00`);

  return {
    week: parseInt(week, 10),
    startDate,
    endDate,
    githubIssueUrl: '', // 나중에 채움
  };
}

// GraphQL로 프로젝트 아이템 가져오기
async function getProjectItems(projectId: string): Promise<ProjectItem[]> {
  const query = `
    query {
      node(id: "${projectId}") {
        ... on ProjectV2 {
          id
          title
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  title
                  url
                  number
                  repository {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await octokit.graphql(query) as {
      node: {
        id: string;
        title: string;
        items: {
          nodes: Array<{
            id: string;
            content?: {
              title: string;
              url: string;
              number: number;
              repository: { name: string };
            };
          }>;
        };
      };
    };

    return response.node.items.nodes
      .filter((item) => item.content?.repository?.name === 'archive')
      .map((item) => ({
        id: item.id,
        content: {
          title: item.content!.title,
          url: item.content!.url,
          number: item.content!.number,
        },
      }));
  } catch (error) {
    console.error('❌ GraphQL error:', error);
    throw error;
  }
}

// 조직의 모든 프로젝트 가져오기
async function getProjects() {
  const query = `
    query {
      organization(login: "hanghae-story-forge") {
        projectsV2(first: 20) {
          nodes {
            id
            title
            url
            number
            closed
          }
        }
      }
    }
  `;

  try {
    const response = await octokit.graphql(query) as {
      organization: {
        projectsV2: {
          nodes: Array<{
            id: string;
            title: string;
            url: string;
            number: number;
            closed: boolean;
          }>;
        };
      };
    };

    return response.organization.projectsV2.nodes;
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    throw error;
  }
}

// 기수 생성 또는 조회
async function getOrCreateGeneration(name: string) {
  const existing = await db.select().from(generations).where(eq(generations.name, name)).limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 똥글똥글 조직 조회
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, 'dongueldonguel')).limit(1);

  if (!org) {
    throw new Error('똥글똥글 조직을 찾을 수 없습니다. 먼저 조직을 생성해주세요.');
  }

  // 새 기수 생성 (시작일은 첫 회차 시작일로 설정, 나중에 업데이트됨)
  const newGeneration = await db
    .insert(generations)
    .values({
      name,
      organizationId: org.id,
      startedAt: new Date(),
      isActive: true,
    })
    .returning();

  console.log(`  ✅ Created generation: ${name}`);
  return newGeneration[0];
}

// 회차 동기화
async function syncCycle(generationId: number, cycleData: CycleData) {
  // 기존 회차 조회 (기수 + 주차로 식별)
  const existing = await db
    .select()
    .from(cycles)
    .where(and(eq(cycles.generationId, generationId), eq(cycles.week, cycleData.week)))
    .limit(1);

  if (existing.length > 0) {
    // 업데이트
    await db
      .update(cycles)
      .set({
        startDate: cycleData.startDate,
        endDate: cycleData.endDate,
        githubIssueUrl: cycleData.githubIssueUrl,
      })
      .where(eq(cycles.id, existing[0].id));

    console.log(
      `  🔄 Updated cycle week: ${cycleData.week} (${cycleData.startDate.toLocaleDateString()} ~ ${cycleData.endDate.toLocaleDateString()})`
    );
    return existing[0];
  }

  // 새 회차 생성
  const newCycle = await db
    .insert(cycles)
    .values({
      generationId,
      week: cycleData.week,
      startDate: cycleData.startDate,
      endDate: cycleData.endDate,
      githubIssueUrl: cycleData.githubIssueUrl,
    })
    .returning();

  console.log(
    `  ✅ Created cycle week: ${cycleData.week} (${cycleData.startDate.toLocaleDateString()} ~ ${cycleData.endDate.toLocaleDateString()})`
  );
  return newCycle[0];
}

// 메인 실행
async function main() {
  await initGitHub();
  console.log('🔍 Fetching GitHub Projects for hanghae-story-forge...\n');

  const projects = await getProjects();
  console.log(`✅ Found ${projects.length} projects\n`);

  // "똥글똥글 N기" 패턴의 프로젝트만 필터링
  const generationProjects = projects.filter((p) => /^똥글똥글 \d+기$/.test(p.title));

  console.log(`📋 Found ${generationProjects.length} generation projects:\n`);

  for (const project of generationProjects) {
    console.log(`📋 Processing: ${project.title}`);

    // 기수 생성/조회
    const generation = await getOrCreateGeneration(project.title);

    // 프로젝트 아이템 가져오기
    const items = await getProjectItems(project.id);
    console.log(`  Found ${items.length} cycles`);

    // 각 아이템을 회차로 변환하여 동기화
    for (const item of items) {
      const cycleData = parseCycleTitle(item.content.title);
      if (cycleData) {
        cycleData.githubIssueUrl = item.content.url;
        await syncCycle(generation.id, cycleData);
      }
    }

    console.log('');
  }

  console.log('✅ Sync complete!');
  await client.end();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
