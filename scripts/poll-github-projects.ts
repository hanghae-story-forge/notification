import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Octokit } from 'octokit';
import postgres from 'postgres';
import { generations } from '../src/infrastructure/persistence/drizzle-db/schema.js';
import { env } from '../src/env';
import { getGitHubClient } from '../src/infrastructure/lib/github';

const API_URL = process.env.API_URL;

let octokit: Octokit;
let client: postgres.Sql<{}>;
let db: ReturnType<typeof drizzle>;

async function init() {
  octokit = await getGitHubClient();
  client = postgres(env.DATABASE_URL);
  db = drizzle(client);

  if (!API_URL) {
    console.error('❌ API_URL environment variable is required');
    process.exit(1);
  }
}

// 기수 이름 패턴 (예: "똥글똥글 1기", "똥글똥글 2기")
const GENERATION_NAME_PATTERN = /^똥글똥글\s*\d+기$/;

async function getGitHubProjects() {
  try {
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
              createdAt
            }
          }
        }
      }
    `;

    const response = await octokit.graphql(query) as {
      organization: {
        projectsV2: {
          nodes: Array<{
            id: string;
            title: string;
            url: string;
            number: number;
            closed: boolean;
            createdAt: string;
          }>;
        };
      };
    };

    return response.organization.projectsV2.nodes;
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    return [];
  }
}

async function getExistingGenerationNames() {
  const result = await db.select({ name: generations.name }).from(generations);
  return new Set(result.map((g) => g.name));
}

async function createGenerationViaGraphQL(name: string, startedAt: string) {
  const mutation = `
    mutation CreateGeneration($name: String!, $startedAt: String!) {
      addGeneration(name: $name, startedAt: $startedAt) {
        id
        name
        startedAt
        isActive
      }
    }
  `;

  const response = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: mutation,
      variables: { name, startedAt },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    data: { addGeneration: { id: number; name: string; startedAt: string; isActive: boolean } };
  };
  return data.data.addGeneration;
}

async function main() {
  await init();
  console.log('🔍 Polling GitHub Projects for new generations...\n');

  // GitHub Projects 조회
  const projects = await getGitHubProjects();

  // 기수 이름 패턴에 맞는 프로젝트 필터링
  const generationProjects = projects.filter((p) =>
    GENERATION_NAME_PATTERN.test(p.title)
  );

  console.log(`Found ${generationProjects.length} potential generation projects`);

  // 이미 존재하는 기수 이름 조회
  const existingNames = await getExistingGenerationNames();

  // 새로운 기수 찾기
  const newGenerations = generationProjects.filter((p) => !existingNames.has(p.title));

  if (newGenerations.length === 0) {
    console.log('No new generations to create');
    await client.end();
    return;
  }

  console.log(`\nCreating ${newGenerations.length} new generations:\n`);

  for (const project of newGenerations) {
    try {
      console.log(`Creating: ${project.title}`);

      const generation = await createGenerationViaGraphQL(
        project.title,
        project.createdAt
      );

      console.log(`✅ Created: ${generation.name} (ID: ${generation.id})`);
    } catch (error) {
      console.error(`❌ Failed to create ${project.title}:`, error);
    }
  }

  await client.end();
  console.log('\n✅ Polling complete');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
