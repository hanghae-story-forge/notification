const DEFAULT_ORGANIZATION_SLUG = "donguel-donguel";
const DISCORD_RESPONSE_CHANNEL_MESSAGE_WITH_SOURCE = 4;

interface CurrentCycleRow {
  id: number;
  week: number;
  generation_name: string;
  organization_slug: string;
  start_date: string;
  end_date: string;
  github_issue_url: string | null;
  required_count: number | null;
  submitted_count: number | null;
}

interface SubmittedMemberRow {
  name: string;
  github_username: string | null;
  url: string;
}

interface NotSubmittedMemberRow {
  name: string;
  github_username: string | null;
}

export interface DiscordInteractionResponse {
  type: number;
  data?: {
    content: string;
    flags?: number;
  };
}

function formatRemainingTime(endDate: string): string {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const remainingHours = Math.max(0, Math.floor((end - now) / 3_600_000));
  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;

  if (days <= 0 && hours <= 0) return "오늘 마감";
  if (days <= 0) return `마감까지 ${hours}시간`;
  return `마감까지 ${days}일 ${hours}시간`;
}

function formatName(row: { name: string; github_username: string | null }) {
  return row.github_username
    ? `${row.name} (@${row.github_username})`
    : row.name;
}

function formatSubmitted(rows: SubmittedMemberRow[]) {
  if (rows.length === 0) return "아직 제출자가 없어요.";
  return rows
    .slice(0, 10)
    .map((row) => `- ${formatName(row)}: ${row.url}`)
    .join("\n");
}

function formatNotSubmitted(rows: NotSubmittedMemberRow[]) {
  if (rows.length === 0) return "전원 제출 완료";
  return rows
    .slice(0, 15)
    .map((row) => `- ${formatName(row)}`)
    .join("\n");
}

export async function createCycleCurrentResponse(
  db: D1Database,
  organizationSlug = DEFAULT_ORGANIZATION_SLUG,
): Promise<DiscordInteractionResponse> {
  const cycle = await db
    .prepare(
      `
      SELECT
        c.id,
        c.week,
        g.name AS generation_name,
        o.slug AS organization_slug,
        c.start_date,
        c.end_date,
        c.github_issue_url,
        COUNT(DISTINCT gp.member_id) AS required_count,
        COUNT(DISTINCT s.member_id) AS submitted_count
      FROM cycles c
      INNER JOIN generations g ON g.id = c.generation_id
      INNER JOIN organizations o ON o.id = g.organization_id
      LEFT JOIN generation_participants gp
        ON gp.generation_id = g.id
       AND gp.status = 'APPROVED'
      LEFT JOIN submissions s
        ON s.cycle_id = c.id
       AND s.status = 'ACCEPTED'
      WHERE o.slug = ?
        AND c.status IN ('OPEN', 'SCHEDULED')
        AND datetime(c.start_date) <= datetime('now')
        AND datetime(c.end_date) >= datetime('now')
      GROUP BY c.id, g.name, o.slug
      ORDER BY datetime(c.start_date) DESC, c.id DESC
      LIMIT 1
    `,
    )
    .bind(organizationSlug)
    .first<CurrentCycleRow>();

  if (!cycle) {
    return {
      type: DISCORD_RESPONSE_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "🗓️ **현재 진행 중인 주차를 찾지 못했어요.**\n\n" +
          "운영자라면 `/cycle create`로 주차를 열었는지 확인해 주세요.\n" +
          "Cloudflare Worker는 Render API를 깨우지 않고 D1에서 직접 조회합니다.",
      },
    };
  }

  const submitted = await db
    .prepare(
      `
      SELECT m.name, m.github_username, s.url
      FROM submissions s
      INNER JOIN members m ON m.id = s.member_id
      WHERE s.cycle_id = ?
        AND s.status = 'ACCEPTED'
      ORDER BY datetime(s.submitted_at) ASC, m.name ASC
      -- submitted_members
    `,
    )
    .bind(cycle.id)
    .all<SubmittedMemberRow>();

  const notSubmitted = await db
    .prepare(
      `
      SELECT m.name, m.github_username
      FROM generation_participants gp
      INNER JOIN members m ON m.id = gp.member_id
      LEFT JOIN submissions s
        ON s.cycle_id = ?
       AND s.member_id = gp.member_id
       AND s.status = 'ACCEPTED'
      WHERE gp.generation_id = (
        SELECT generation_id FROM cycles WHERE id = ?
      )
        AND gp.status = 'APPROVED'
        AND s.id IS NULL
      ORDER BY m.name ASC
      -- not_submitted_members
    `,
    )
    .bind(cycle.id, cycle.id)
    .all<NotSubmittedMemberRow>();

  const requiredCount = Number(cycle.required_count ?? 0);
  const submittedCount = Number(
    cycle.submitted_count ?? submitted.results.length,
  );
  const notSubmittedCount = Math.max(requiredCount - submittedCount, 0);
  const issueLine = cycle.github_issue_url
    ? `\n이슈: ${cycle.github_issue_url}`
    : "";

  return {
    type: DISCORD_RESPONSE_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content:
        `📚 **${cycle.generation_name} ${cycle.week}주차**\n` +
        `${formatRemainingTime(cycle.end_date)}${issueLine}\n\n` +
        `제출 현황: ${submittedCount}/${requiredCount}명 제출, ${notSubmittedCount}명 미제출\n\n` +
        `✅ 제출자\n${formatSubmitted(submitted.results)}\n\n` +
        `🕐 미제출자\n${formatNotSubmitted(notSubmitted.results)}\n\n` +
        "다음 행동: 제출자는 `/submit url:<글 URL>`로 기록하고, 본인 상태는 `/me info`로 확인해 주세요.",
    },
  };
}
