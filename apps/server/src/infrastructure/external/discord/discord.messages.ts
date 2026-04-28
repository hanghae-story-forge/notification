// Discord Message Builders

import { DiscordMessage } from './discord.interface';

function formatNamesAsList(names: string[]): string {
  return names.map((name) => `- ${name}`).join('\n');
}

function formatRemainingTime(deadline: Date): string {
  const hoursLeft = Math.max(
    0,
    Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60))
  );

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
          `${cycleName} 글이 정상 기록됐어요.\n\n` +
          `[글 보러가기](${blogUrl})\n` +
          '다음 확인: `/cycle status`',
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

  return {
    content: `⏰ ${cycleName} 마감이 얼마 남지 않았어요.`,
    embeds: [
      {
        title: '아직 제출이 필요한 멤버가 있어요',
        description:
          `남은 시간: ${timeText}\n` +
          `아직 제출 전: ${notSubmitted.length}명\n\n` +
          `${formatNamesAsList(notSubmitted)}\n\n` +
          '**해야 할 일**\n' +
          '1. 글 링크를 준비합니다.\n' +
          '2. 이번 주차 GitHub 이슈 댓글에 링크를 남깁니다.\n' +
          '3. 제출 후 `/me info`로 상태를 확인합니다.',
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
  const progressRate =
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
        description: isEveryoneSubmitted
          ? '🎉 전원 제출 완료!\n이번 주차 모든 참여자가 제출을 완료했어요.'
          : `진행률: ${submitted.length} / ${totalParticipants}명 제출, ${progressRate}%\n` +
            `남은 인원: ${notSubmitted.length}명`,
        color: isEveryoneSubmitted ? 0x00ff00 : 0x0099ff,
        fields: [
          {
            name: `✅ 제출 ${submitted.length}명`,
            value: submittedValue,
            inline: false,
          },
          {
            name: `⏳ 아직 미제출 ${notSubmitted.length}명`,
            value: notSubmittedValue,
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
