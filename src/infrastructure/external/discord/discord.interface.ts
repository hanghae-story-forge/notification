// Discord Notification Interface

/**
 * Discord 메시지 포맷
 */
export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Discord Embed 포맷
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

/**
 * Discord Webhook 인터페이스
 *
 * 책임:
 * - Discord webhook으로 메시지 전송
 * - 다양한 형식의 알림 메시지 전송
 */
export interface IDiscordWebhookClient {
  /**
   * Discord webhook으로 메시지 전송
   */
  sendMessage(webhookUrl: string, message: DiscordMessage): Promise<void>;

  /**
   * 제출 알림 전송
   */
  sendSubmissionNotification(
    webhookUrl: string,
    memberName: string,
    cycleName: string,
    blogUrl: string
  ): Promise<void>;

  /**
   * 마감 임박 알림 전송
   */
  sendReminderNotification(
    webhookUrl: string,
    cycleName: string,
    endDate: Date,
    notSubmittedNames: string[]
  ): Promise<void>;

  /**
   * 제출 현황 전송
   */
  sendStatusNotification(
    webhookUrl: string,
    cycleName: string,
    submittedNames: string[],
    notSubmittedNames: string[],
    endDate: Date
  ): Promise<void>;
}
