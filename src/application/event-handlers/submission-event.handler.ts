// Submission Event Handlers

import { SubmissionRecordedEvent } from '../../domain/submission/submission.domain';
import { IDiscordWebhookClient } from '../../infrastructure/external/discord';

/**
 * 제출 관련 도메인 이벤트 핸들러
 *
 * 책임:
 * - Submission 도메인 이벤트를 수신하고 외부 알림 전송
 */
export class SubmissionEventHandler {
  constructor(private readonly discordClient: IDiscordWebhookClient) {}

  /**
   * 제출 기록 이벤트 처리
   */
  async handleSubmissionRecorded(
    event: SubmissionRecordedEvent,
    webhookUrl: string,
    memberName: string,
    cycleName: string,
    blogUrl: string
  ): Promise<void> {
    await this.discordClient.sendSubmissionNotification(
      webhookUrl,
      memberName,
      cycleName,
      blogUrl
    );
  }
}
