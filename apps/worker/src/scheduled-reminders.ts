interface ReminderCycleRow {
  cycle_id: number;
  cycle_week: number;
  generation_name: string;
  organization_slug: string;
  github_issue_url: string | null;
  end_date: string;
  missing_members: string | null;
  reminder_key: string;
}

export async function runDeadlineReminders(env: Env): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) {
    console.warn("DISCORD_WEBHOOK_URL is not configured; skipping reminders");
    return;
  }

  const reminders = await findUpcomingDeadlineReminders(env.DB);

  for (const reminder of reminders) {
    const content = formatReminderMessage(reminder);
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });

    await env.DB.prepare(
      `
        INSERT INTO notification_logs (
          provider,
          channel_id,
          message_type,
          payload,
          sent_at,
          failed_at,
          error_message,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
    )
      .bind(
        "DISCORD",
        "DISCORD_WEBHOOK_URL",
        reminder.reminder_key,
        JSON.stringify({ cycleId: reminder.cycle_id, status: response.status }),
        response.ok ? new Date().toISOString() : null,
        response.ok ? null : new Date().toISOString(),
        response.ok ? null : `Discord webhook responded ${response.status}`,
      )
      .run();
  }
}

async function findUpcomingDeadlineReminders(
  db: D1Database,
): Promise<ReminderCycleRow[]> {
  const result = await db
    .prepare(
      `
      SELECT
        c.id AS cycle_id,
        c.week AS cycle_week,
        g.name AS generation_name,
        o.slug AS organization_slug,
        c.github_issue_url AS github_issue_url,
        c.end_date AS end_date,
        GROUP_CONCAT(m.name || '(' || COALESCE(m.github_username, 'github-missing') || ')', ', ') AS missing_members,
        'cycle:' || c.id || ':deadline-minus-1d' AS reminder_key
      FROM cycles c
      INNER JOIN generations g ON g.id = c.generation_id
      INNER JOIN organizations o ON o.id = g.organization_id
      INNER JOIN generation_participants gp ON gp.generation_id = g.id AND gp.status = 'APPROVED'
      INNER JOIN members m ON m.id = gp.member_id
      LEFT JOIN submissions s ON s.cycle_id = c.id AND s.member_id = m.id AND s.status = 'ACCEPTED'
      WHERE c.status IN ('ACTIVE', 'OPEN')
        AND s.id IS NULL
        AND datetime(c.end_date) <= datetime('now', '+1 day')
        AND datetime(c.end_date) >= datetime('now')
        AND NOT EXISTS (
          SELECT 1
          FROM notification_logs nl
          WHERE nl.message_type = 'cycle:' || c.id || ':deadline-minus-1d'
            AND nl.sent_at IS NOT NULL
        )
      GROUP BY c.id, c.week, g.name, o.slug, c.github_issue_url, c.end_date
      ORDER BY c.end_date ASC
      `,
    )
    .bind()
    .all<ReminderCycleRow>();

  return result.results;
}

function formatReminderMessage(reminder: ReminderCycleRow): string {
  const issueLine = reminder.github_issue_url
    ? `\n제출 이슈: ${reminder.github_issue_url}`
    : "";
  const missingMembers = reminder.missing_members || "미제출자 없음";

  return [
    `⏰ **${reminder.generation_name} ${reminder.cycle_week}주차 제출 마감이 다가오고 있어요.**`,
    `마감: ${reminder.end_date}`,
    `아직 제출 확인이 필요한 멤버: ${missingMembers}`,
    `제출 댓글을 GitHub 이슈에 남기면 Worker가 D1에 바로 기록합니다.${issueLine}`,
  ].join("\n");
}
