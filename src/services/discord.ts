interface DiscordWebhookPayload {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
  }>;
}

// 제출 알림 메시지 생성
export function createSubmissionMessage(
  memberName: string,
  blogUrl: string,
  cycleName: string
): DiscordWebhookPayload {
  return {
    content: `🎉 ${memberName}님이 글을 제출했습니다!`,
    embeds: [
      {
        title: `${cycleName} 제출 완료`,
        description: `[글 보러가기](${blogUrl})`,
        color: 0x00ff00, // 초록색
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// 리마인더 알림 메시지 생성
export function createReminderMessage(
  cycleName: string,
  deadline: Date,
  notSubmitted: string[]
): DiscordWebhookPayload {
  const hoursLeft = Math.floor(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60)
  );
  const timeText =
    hoursLeft >= 24
      ? `${Math.floor(hoursLeft / 24)}일 ${hoursLeft % 24}시간`
      : `${hoursLeft}시간`;

  return {
    content: `⏰ ${cycleName} 마감까지 ${timeText} 남았습니다!`,
    embeds: [
      {
        title: '미제출자 목록',
        description: notSubmitted.join(', '),
        color: 0xffaa00, // 주황색
        fields: [
          {
            name: '마감 시간',
            value: `<t:${Math.floor(deadline.getTime() / 1000)}:F>`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// 제출 현황 메시지 생성
export function createStatusMessage(
  cycleName: string,
  submitted: string[],
  notSubmitted: string[],
  deadline: Date
): DiscordWebhookPayload {
  return {
    embeds: [
      {
        title: `${cycleName} 제출 현황`,
        color: 0x0099ff, // 파란색
        fields: [
          {
            name: `✅ 제출 (${submitted.length})`,
            value: submitted.length > 0 ? submitted.join(', ') : '없음',
            inline: false,
          },
          {
            name: `❌ 미제출 (${notSubmitted.length})`,
            value: notSubmitted.length > 0 ? notSubmitted.join(', ') : '없음',
            inline: false,
          },
          {
            name: '⏰ 마감 시간',
            value: `<t:${Math.floor(deadline.getTime() / 1000)}:R>`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// Discord webhook 전송
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }
}
