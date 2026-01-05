// Discord Webhook Service

import {
  sendDiscordWebhook as originalSendDiscordWebhook,
  createSubmissionMessage,
} from '../../../services/discord';

/**
 * Discord 웹훅 전송 서비스
 * (기존 discord.ts 서비스를 인프라스트럭처 계층으로 이동)
 */
export class DiscordWebhookService {
  async sendSubmissionNotification(
    memberName: string,
    blogUrl: string,
    cycleName: string
  ): Promise<void> {
    const message = createSubmissionMessage(memberName, blogUrl, cycleName);
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('DISCORD_WEBHOOK_URL not set, skipping notification');
      return;
    }

    await originalSendDiscordWebhook(webhookUrl, message);
  }
}
