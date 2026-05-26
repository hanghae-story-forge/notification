import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/common/errors';
import { RecordDiscordSubmissionCommand } from '@/application/commands/record-discord-submission.command';
import { DiscordCommand } from './types';

const DEFAULT_ORGANIZATION_SLUG = 'donguel-donguel';

export class SubmitCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('submit')
    .setDescription('현재 회차에 글 URL을 제출합니다')
    .addStringOption((option) =>
      option.setName('url').setDescription('제출할 글 URL').setRequired(true)
    );

  constructor(
    private readonly recordSubmissionCommand: RecordDiscordSubmissionCommand
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const blogUrl = interaction.options.getString('url', true);

    try {
      const result = await this.recordSubmissionCommand.execute({
        discordUserId: interaction.user.id,
        organizationSlug: DEFAULT_ORGANIZATION_SLUG,
        blogUrl,
      });

      await interaction.editReply({
        content:
          `✅ **제출 완료!**\n\n` +
          `스터디: ${result.generationName} ${result.cycleWeek}주차\n` +
          `제출자: ${result.memberName}\n` +
          `제출한 글: ${result.submittedUrl}\n\n` +
          `전체 현황 보기: ${result.statusPath}\n` +
          `다음 행동: \`/cycle status\`로 같은 스터디원들의 참여 현황을 확인해 주세요.`,
      });
    } catch (error) {
      await interaction.editReply({ content: this.formatErrorMessage(error) });
    }
  }

  private formatErrorMessage(error: unknown): string {
    if (error instanceof NotFoundError) {
      if (error.message.includes('Member')) {
        return (
          '👤 **아직 멤버 등록이 필요해요.**\n\n' +
          '1. `/member create`로 스터디봇에 먼저 등록해 주세요.\n' +
          '2. GitHub 계정을 연결한 뒤 다시 `/submit url:<글 URL>`을 실행해 주세요.'
        );
      }

      return (
        '🗓️ **현재 제출 가능한 회차를 찾지 못했어요.**\n\n' +
        '운영자에게 현재 회차가 열려 있는지 확인해 달라고 요청해 주세요.\n' +
        '운영자는 `/cycle current`와 `/cycle list`로 회차 상태를 확인할 수 있어요.'
      );
    }

    if (error instanceof ForbiddenError) {
      return (
        '🚪 **조직 가입 또는 승인이 필요해요.**\n\n' +
        '1. `/organization join`으로 조직 가입을 신청해 주세요.\n' +
        '2. 운영진 승인 후 `/generation join` 또는 `/generation apply`를 진행해 주세요.\n' +
        '3. 승인 상태는 `/me info`에서 확인할 수 있어요.'
      );
    }

    if (error instanceof ConflictError) {
      return (
        '✅ **이미 이번 회차에 제출한 기록이 있어요.**\n\n' +
        '`/cycle status`로 제출 현황을 확인해 주세요.\n' +
        'URL 수정이 필요하면 운영진에게 요청해 주세요.'
      );
    }

    return (
      '❌ 제출 처리 중 오류가 발생했습니다.\n' +
      '잠시 후 다시 시도하거나 운영진에게 알려 주세요.'
    );
  }
}
