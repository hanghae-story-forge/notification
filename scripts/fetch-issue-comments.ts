import 'dotenv/config';
import { Octokit } from 'octokit';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { members, cycles, generations, submissions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const client = postgres(DATABASE_URL);
const db = drizzle(client);

// URL 추출 함수
function extractUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[1] : null;
}

// Issue 댓글 가져오기
async function getIssueComments(owner: string, repo: string, issueNumber: number) {
  try {
    const response = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return response.data.map((comment) => ({
      id: comment.id.toString(),
      author: comment.user?.login,
      body: comment.body,
      url: extractUrl(comment.body || ''),
      createdAt: comment.created_at,
    }));
  } catch (error) {
    console.error(`❌ Error fetching comments for ${owner}/${repo}#${issueNumber}:`, error);
    return [];
  }
}

// 제출 내역 DB에 저장
async function saveSubmission(cycleId: number, github: string, url: string, commentId: string) {
  // 멤버 조회
  const member = await db.select().from(members).where(eq(members.github, github)).limit(1);

  if (member.length === 0) {
    console.warn(`  ⚠️  Member not found: @${github}`);
    return null;
  }

  // 이미 존재하는 제출 확인
  const existing = await db
    .select()
    .from(submissions)
    .where(eq(submissions.githubCommentId, commentId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 제출 저장
  const newSubmission = await db
    .insert(submissions)
    .values({
      cycleId,
      memberId: member[0].id,
      url,
      githubCommentId: commentId,
      submittedAt: new Date(),
    })
    .returning();

  return newSubmission[0];
}

// 메인 실행
async function main() {
  // 똥글똥글 1기의 모든 회차 가져오기
  const generation = await db.select().from(generations).where(eq(generations.name, '똥글똥글 1기')).limit(1);

  if (generation.length === 0) {
    console.error('❌ "똥글똥글 1기" not found');
    process.exit(1);
  }

  const allCycles = await db
    .select()
    .from(cycles)
    .where(eq(cycles.generationId, generation[0].id))
    .orderBy(cycles.week);

  console.log(`📋 Found ${allCycles.length} cycles for "똥글똥글 1기"\n`);

  let totalSubmissions = 0;

  for (const cycle of allCycles) {
    if (!cycle.githubIssueUrl) {
      console.log(`⏭️  Week ${cycle.week}: No GitHub Issue URL`);
      continue;
    }

    // Issue URL에서 owner, repo, issue number 추출
    const urlMatch = cycle.githubIssueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!urlMatch) {
      console.log(`⚠️  Week ${cycle.week}: Invalid GitHub Issue URL`);
      continue;
    }

    const [, owner, repo, issueNumber] = urlMatch;

    console.log(`\n📝 Week ${cycle.week}: ${cycle.githubIssueUrl}`);

    // 댓글 가져오기
    const comments = await getIssueComments(owner, repo, parseInt(issueNumber, 10));

    if (comments.length === 0) {
      console.log(`   No comments found`);
      continue;
    }

    console.log(`   Found ${comments.length} comments`);

    // 각 댓글 처리
    for (const comment of comments) {
      if (!comment.author || comment.author === 'github-actions[bot]') {
        continue;
      }

      if (!comment.url) {
        console.log(`   ⚠️  @${comment.author}: No URL found`);
        continue;
      }

      const submission = await saveSubmission(cycle.id, comment.author, comment.url, comment.id);
      if (submission) {
        console.log(`   ✅ @${comment.author}: ${comment.url}`);
        totalSubmissions++;
      }
    }
  }

  console.log(`\n✅ Total submissions: ${totalSubmissions}`);
  await client.end();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
