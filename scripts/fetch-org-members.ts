import 'dotenv/config';
import { Octokit } from 'octokit';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  console.error('Create a token at: https://github.com/settings/tokens');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

interface OrganizationMember {
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  role: string;
}

async function getOrganizationMembers(org: string): Promise<OrganizationMember[]> {
  console.log(`🔍 Fetching members for @${org}...\n`);

  const members: OrganizationMember[] = [];

  try {
    // 조직 멤버 목록 가져오기 (pagination 처리)
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

      // 각 멤버의 상세 정보 가져오기
      for (const member of response.data) {
        try {
          const userResponse = await octokit.rest.users.getByUsername({
            username: member.login,
          });

          members.push({
            login: userResponse.data.login,
            name: userResponse.data.name,
            email: userResponse.data.email,
            avatarUrl: userResponse.data.avatar_url,
            role: member.role === 'admin' ? 'Admin' : 'Member',
          });
        } catch (error) {
          console.warn(`  ⚠️  Failed to fetch details for @${member.login}`);
          members.push({
            login: member.login,
            name: null,
            email: null,
            avatarUrl: member.avatar_url,
            role: member.role === 'admin' ? 'Admin' : 'Member',
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

async function main() {
  const members = await getOrganizationMembers('hanghae-story-forge');

  console.log(`✅ Found ${members.length} members:\n`);

  for (const member of members) {
    console.log(`👤 ${member.login}`);
    if (member.name) {
      console.log(`   Name: ${member.name}`);
    }
    if (member.email) {
      console.log(`   Email: ${member.email}`);
    }
    console.log(`   Role: ${member.role}`);
    console.log(`   Avatar: ${member.avatarUrl}`);
    console.log('');
  }

  console.log(`\n📊 GitHub usernames (for database):\n`);
  console.log(members.map((m) => m.login).join(', '));
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
