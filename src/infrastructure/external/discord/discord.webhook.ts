// Discord Webhook Service Implementation

import {
  sendDiscordWebhook,
  createSubmissionMessage,
  createReminderMessage,
  createStatusMessage,
} from './discord.messages';
import { IDiscordWebhookClient, DiscordMessage } from './discord.interface';

/**
 * Discord 웹훅 클라이언트 구현
 *
 * 메시지 생성과 전송을 담당하는 인프라스트럭처 계층
 */
export class DiscordWebhookClient implements IDiscordWebhookClient {
  async sendMessage(
    webhookUrl: string,
    message: DiscordMessage
  ): Promise<void> {
    await sendDiscordWebhook(webhookUrl, message);
  }

  async sendSubmissionNotification(
    webhookUrl: string,
    memberName: string,
    cycleName: string,
    blogUrl: string
  ): Promise<void> {
    const message = createSubmissionMessage(memberName, blogUrl, cycleName);
    await this.sendMessage(webhookUrl, message);
  }

  async sendReminderNotification(
    webhookUrl: string,
    cycleName: string,
    endDate: Date,
    notSubmittedNames: string[]
  ): Promise<void> {
    const message = createReminderMessage(
      cycleName,
      endDate,
      notSubmittedNames
    );
    await this.sendMessage(webhookUrl, message);
  }

  async sendStatusNotification(
    webhookUrl: string,
    cycleName: string,
    submittedNames: string[],
    notSubmittedNames: string[],
    endDate: Date
  ): Promise<void> {
    const message = createStatusMessage(
      cycleName,
      submittedNames,
      notSubmittedNames,
      endDate
    );
    await this.sendMessage(webhookUrl, message);
  }
}
