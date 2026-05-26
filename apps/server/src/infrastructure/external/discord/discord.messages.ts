// Discord Message Builders

import { DiscordMessage } from './discord.interface';

function formatNamesAsList(names: string[]): string {
  return names.map((name) => `- ${name}`).join('\n');
}

function formatRemainingTime(deadline: Date): string {
  const hoursLeft = Math.floor(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60)
  );

  if (hoursLeft <= 0) {
    return '지금 마감';
  }

  if (hoursLeft >= 24) {
    return `${Math.floor(hoursLeft / 24)}일 ${hoursLeft % 24}시간`;
  }

  return `${hoursLeft}시간`;
}

/**
 * 제출 알림 메시지 생성
 */
export function createSubmissionMessage(
  memberName: string,
  blogUrl: string,
  cycleName: string
): DiscordMessage {
  return {
    content: `🎉 ${memberName}님 제출 완료!`,
    embeds: [
      {
        title: `${cycleName} 제출 완료`,
        description:
          '정상 기록됐어요. 제출 현황에서 바로 확인할 수 있습니다.\n\n' +
          `🔗 [글 보러가기](${blogUrl})\n` +
          '📊 전체 제출 현황은 `/cycle status`로 확인해 주세요.',
        color: 0x00ff00, // 초록색
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * 리마인더 알림 메시지 생성
 */
export function createReminderMessage(
  cycleName: string,
  deadline: Date,
  notSubmitted: string[]
): DiscordMessage {
  const timeText = formatRemainingTime(deadline);
  const isEveryoneSubmitted = notSubmitted.length === 0;

  return {
    content: isEveryoneSubmitted
      ? `🎉 ${cycleName} 전원 제출 완료!`
      : `⏰ ${cycleName} 마감 리마인더 · 미제출 ${notSubmitted.length}명`,
    embeds: [
      {
        title: `${cycleName} 제출 리마인더`,
        description: isEveryoneSubmitted
          ? '🎉 전원 제출 완료! 지금은 추가로 제출을 요청할 대상이 없어요.'
          : `⏰ 남은 시간: ${timeText}\n` +
            `📌 아직 제출 전: ${notSubmitted.length}명\n` +
            `${formatNamesAsList(notSubmitted)}\n\n` +
            '**제출 방법**\n' +
            '1. 이번 주차 글을 작성합니다.\n' +
            '2. GitHub 이슈 댓글에 링크를 남깁니다.\n' +
            '3. `/me info`로 내 제출 상태를 확인합니다.',
        color: isEveryoneSubmitted ? 0x00ff00 : 0xffaa00, // 초록색 / 주황색
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

/**
 * 제출 현황 메시지 생성
 */
export function createStatusMessage(
  cycleName: string,
  submitted: string[],
  notSubmitted: string[],
  deadline: Date
): DiscordMessage {
  const totalParticipants = submitted.length + notSubmitted.length;
  const progressPercent =
    totalParticipants === 0
      ? 0
      : Math.round((submitted.length / totalParticipants) * 100);
  const isEveryoneSubmitted =
    totalParticipants > 0 && notSubmitted.length === 0;
  const submittedValue =
    submitted.length > 0
      ? formatNamesAsList(submitted)
      : '아직 제출자가 없어요.';
  const notSubmittedValue = isEveryoneSubmitted
    ? '이번 주차 모든 참여자가 제출을 완료했어요.'
    : formatNamesAsList(notSubmitted);

  return {
    embeds: [
      {
        title: `${cycleName} 제출 현황`,
        description:
          `진행률: ${submitted.length} / ${totalParticipants}명 제출, ${progressPercent}%` +
          (isEveryoneSubmitted ? '\n🎉 전원 제출 완료!' : ''),
        color: isEveryoneSubmitted ? 0x00ff00 : 0x0099ff, // 초록색 / 파란색
        fields: [
          {
            name: `✅ 제출 (${submitted.length})`,
            value: submittedValue,
            inline: false,
          },
          {
            name: `❌ 미제출 (${notSubmitted.length})`,
            value: notSubmittedValue,
            inline: false,
          },
          {
            name: '다음 행동',
            value: isEveryoneSubmitted
              ? '모두 제출 완료됐어요. 다음 주차가 열리면 다시 안내할게요.'
              : '미제출자는 GitHub 이슈 댓글에 글 링크를 남기고 `/me info`로 내 상태를 확인해 주세요.',
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

/**
 * Discord webhook 전송 (내부 구현)
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordMessage
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
