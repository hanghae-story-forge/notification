import 'dotenv/config';
import { Octokit } from 'octokit';
import { getGitHubClient } from '../src/lib/github';

let octokit: Octokit;

async function init() {
  octokit = await getGitHubClient();
}

interface Project {
  id: string;
  title: string;
  description: string | null;
}

interface ProjectField {
  id: string;
  name: string;
}

interface ProjectItem {
  id: string;
  type: string;
  content?: {
    title?: string;
    url?: string;
    number?: number;
    repository?: {
      name: string;
    };
  };
}

async function getProjects() {
  console.log('🔍 Fetching GitHub Projects for hanghae-story-forge...\n');

  try {
    // Organization Projects V2 - GraphQL로 가져오기
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

    const projects = response.organization.projectsV2.nodes.map((project) => ({
      id: project.id,
      title: project.title,
      url: project.url,
      closed: project.closed,
    }));

    console.log(`✅ Found ${projects.length} projects:\n`);

    for (const project of projects) {
      console.log(`📋 ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   URL: ${project.url}`);
      console.log(`   Closed: ${project.closed}`);
      console.log('');
    }

    return projects;
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    throw error;
  }
}

// GraphQL로 더 상세한 프로젝트 정보 가져오기
async function getProjectFields(projectId: string) {
  const query = `
    query {
      node(id: "${projectId}") {
        ... on ProjectV2 {
          id
          title
          url
          number
          fields(first: 20) {
            nodes {
              ... on ProjectV2FieldCommon {
                id
                name
              }
            }
          }
          items(first: 50) {
            nodes {
              id
              type: __typename
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                    text
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                    date
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                    name
                  }
                }
              }
              content {
                ... on DraftIssue {
                  title
                  body
                }
                ... on Issue {
                  title
                  url
                  number
                  repository {
                    name
                  }
                }
                ... on PullRequest {
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
    const response = await octokit.graphql(query);
    return response;
  } catch (error) {
    console.error('❌ GraphQL error:', error);
    throw error;
  }
}

// 메인 실행
async function main() {
  await init();
  const projects = await getProjects();

  if (projects.length > 0) {
    const firstProject = projects[0];
    console.log(`\n🔍 Fetching details for: ${firstProject.title}\n`);

    const details = await getProjectFields(firstProject.id);
    console.log(JSON.stringify(details, null, 2));
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
