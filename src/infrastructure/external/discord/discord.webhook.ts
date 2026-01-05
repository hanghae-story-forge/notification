// Discord Webhook Service Implementation

import {
  sendDiscordWebhook as originalSendDiscordWebhook,
  createSubmissionMessage,
  createReminderMessage,
  createStatusMessage,
} from '../../../services/discord';
import { IDiscordWebhookClient, DiscordMessage } from './discord.interface';

/**
 * Discord 웹훅 클라이언트 구현
 *
 * 기존 discord.ts 서비스를 인프라스트럭처 계층으로 이동하고
 * IDiscordWebhookClient 인터페이스를 구현
 */
export class DiscordWebhookClient implements IDiscordWebhookClient {
  async sendMessage(
    webhookUrl: string,
    message: DiscordMessage
  ): Promise<void> {
    await originalSendDiscordWebhook(webhookUrl, message);
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
