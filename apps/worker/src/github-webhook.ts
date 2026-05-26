const GITHUB_SIGNATURE_PREFIX = "sha256=";

interface GithubIssueCommentPayload {
  action?: string;
  comment?: {
    id?: number | string;
    body?: string;
    user?: {
      login?: string;
    };
  };
  issue?: {
    html_url?: string;
  };
}

interface SubmissionTargetRow {
  cycle_id: number;
  member_id: number;
  member_name: string;
  generation_name: string;
  organization_slug: string;
  cycle_week: number;
}

export interface GithubWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

export async function verifyGithubWebhookSignature({
  body,
  secret,
  signature,
}: {
  body: string;
  secret: string;
  signature: string | null;
}): Promise<boolean> {
  if (!signature?.startsWith(GITHUB_SIGNATURE_PREFIX) || !secret) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const expected = `${GITHUB_SIGNATURE_PREFIX}${toHex(digest)}`;

  return constantTimeEqual(expected, signature);
}

export async function handleGithubWebhook({
  db,
  event,
  body,
}: {
  db: D1Database;
  event: string | null;
  body: string;
}): Promise<GithubWebhookResult> {
  if (event !== "issue_comment") {
    return {
      status: 202,
      body: { message: "GitHub event ignored", event },
    };
  }

  let payload: GithubIssueCommentPayload;
  try {
    payload = JSON.parse(body) as GithubIssueCommentPayload;
  } catch {
    return {
      status: 400,
      body: { message: "Invalid GitHub webhook payload" },
    };
  }

  if (payload.action !== "created") {
    return {
      status: 202,
      body: {
        message: "GitHub issue_comment action ignored",
        action: payload.action,
      },
    };
  }

  const blogUrl = extractFirstUrl(payload.comment?.body ?? "");
  if (!blogUrl) {
    return {
      status: 400,
      body: { message: "No URL found in comment" },
    };
  }

  const githubUsername = payload.comment?.user?.login;
  const githubIssueUrl = payload.issue?.html_url;
  const githubCommentId = String(payload.comment?.id ?? "");
  if (!githubUsername || !githubIssueUrl || !githubCommentId) {
    return {
      status: 400,
      body: { message: "Missing GitHub submission fields" },
    };
  }

  const target = await db
    .prepare(
      `
      SELECT
        c.id AS cycle_id,
        c.week AS cycle_week,
        m.id AS member_id,
        m.name AS member_name,
        g.name AS generation_name,
        o.slug AS organization_slug
      FROM cycles c
      INNER JOIN generations g ON g.id = c.generation_id
      INNER JOIN organizations o ON o.id = g.organization_id
      INNER JOIN organization_members om ON om.organization_id = o.id AND om.status = 'approved'
      INNER JOIN members m ON m.id = om.member_id
      WHERE c.github_issue_url = ?
        AND m.github_username = ?
      LIMIT 1
      `,
    )
    .bind(githubIssueUrl, githubUsername)
    .first<SubmissionTargetRow>();

  if (!target) {
    return {
      status: 404,
      body: { message: "No active member/cycle found for GitHub submission" },
    };
  }

  await db
    .prepare(
      `
      INSERT INTO submissions (
        cycle_id,
        member_id,
        url,
        github_comment_id,
        submitted_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
      ON CONFLICT(github_comment_id) DO UPDATE SET
        url = excluded.url,
        submitted_at = excluded.submitted_at,
        updated_at = datetime('now')
      `,
    )
    .bind(target.cycle_id, target.member_id, blogUrl, githubCommentId)
    .run();

  return {
    status: 200,
    body: {
      message: "Submission recorded",
      memberName: target.member_name,
      generationName: target.generation_name,
      organizationSlug: target.organization_slug,
      cycleWeek: target.cycle_week,
      submittedUrl: blogUrl,
    },
  };
}

function extractFirstUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s)]+/)?.[0] ?? null;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }
  return diff === 0;
}
