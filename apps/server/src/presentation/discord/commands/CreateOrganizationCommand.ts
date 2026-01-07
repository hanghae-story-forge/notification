import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { CreateOrganizationCommand as AppCreateOrganizationCommand } from '@/application/commands';
import { DiscordCommand } from './types';

export class CreateOrganizationCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('create-organization')
    .setDescription('새로운 조직을 생성합니다')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('조직 이름 (예: 똥글똥글)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('slug')
        .setDescription('URL 친화적 식별자 (선택사항)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('webhook')
        .setDescription('Discord 웹훅 URL (선택사항)')
        .setRequired(false)
    );

  constructor(
    private readonly createOrganizationCommand: AppCreateOrganizationCommand
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const name = interaction.options.getString('name', true);
      const slug = interaction.options.getString('slug', false);
      const webhookUrl = interaction.options.getString('webhook', false);

      const result = await this.createOrganizationCommand.execute({
        name,
        slug: slug ?? undefined,
        discordWebhookUrl: webhookUrl ?? undefined,
      });

      const organization = result.organization;

      await interaction.editReply({
        content: `✅ 조직이 생성되었습니다!\n\n**조직명**: ${organization.name.value}\n**슬러그**: ${organization.slug.value}\n**활성화**: ${organization.isActive ? '활성' : '비활성'}\n${webhookUrl ? `**웹훅**: ${webhookUrl}` : ''}`,
      });
    } catch (error) {
      console.error('Error handling create-organization command:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      if (errorMessage.includes('already exists')) {
        await interaction.editReply({
          content: '❌ 이미 존재하는 슬러그입니다. 다른 슬러그를 사용해주세요.',
        });
      } else {
        await interaction.editReply({
          content: `❌ 조직 생성 중 오류가 발생했습니다: ${errorMessage}`,
        });
      }
    }
  }
}
