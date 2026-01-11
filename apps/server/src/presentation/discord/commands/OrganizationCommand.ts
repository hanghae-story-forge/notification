import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { CreateOrganizationCommand as AppCreateOrganizationCommand } from '@/application/commands';
import { JoinOrganizationCommand as AppJoinOrganizationCommand } from '@/application/commands';
import { OrganizationRepository } from '@/domain/organization/organization.repository';
import { DiscordCommand } from './types';

export class OrganizationCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('organization')
    .setDescription('조직 관련 명령어')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
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
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('등록된 모든 스터디(조직) 목록을 조회합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('join')
        .setDescription('조직에 가입 신청합니다')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('조직 슬러그 (예: donguel-donguel)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

  constructor(
    private readonly createOrganizationCommand: AppCreateOrganizationCommand,
    private readonly joinOrganizationCommand: AppJoinOrganizationCommand,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'create') {
      await this.handleCreate(interaction);
    } else if (subcommand === 'list') {
      await this.handleList(interaction);
    } else if (subcommand === 'join') {
      await this.handleJoin(interaction);
    }
  }

  private async handleCreate(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
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
      console.error('Error handling organization create:', error);
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

  private async handleList(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply();

    try {
      const allOrgs = await this.organizationRepo.findAll();

      if (allOrgs.length === 0) {
        await interaction.editReply({
          content: '📋 등록된 스터디가 없습니다.',
        });
        return;
      }

      const activeOrgs = allOrgs.filter((org) => org.isActive);

      if (activeOrgs.length === 0) {
        await interaction.editReply({
          content: '📋 활성화된 스터디가 없습니다.',
        });
        return;
      }

      let message = `📋 **스터디 목록** (총 ${activeOrgs.length}개)\n\n`;

      activeOrgs.forEach((org, index) => {
        const dto = org.toDTO();
        message += `**${index + 1}. ${dto.name}**\n`;
        message += `   슬러그: \`${dto.slug}\`\n`;
        if (dto.discordWebhookUrl) {
          message += `   웹훅: 연결됨\n`;
        }
        message += '\n';
      });

      await interaction.editReply({
        content: message,
      });
    } catch (error) {
      console.error('Error handling organization list:', error);
      await interaction.editReply({
        content: '❌ 스터디 목록 조회 중 오류가 발생했습니다.',
      });
    }
  }

  private async handleJoin(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const organizationSlug = interaction.options.getString('name', true);

      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const result = await this.joinOrganizationCommand.execute({
        organizationSlug,
        memberDiscordId: interaction.user.id,
      });

      if (result.isNew) {
        await interaction.editReply({
          content: `✅ 조직 가입 신청이 완료되었습니다!\n\n**조직**: ${result.organization.name.value}\n**상태**: PENDING (승인 대기 중)\n\n관리자의 승인을 기다려주세요.`,
        });
      } else {
        const status = result.organizationMember.status.value;
        if (status === 'APPROVED') {
          await interaction.editReply({
            content: `ℹ️ 이미 승인된 조직원입니다.\n\n**조직**: ${result.organization.name.value}\n**역할**: ${result.organizationMember.role.value}`,
          });
        } else {
          await interaction.editReply({
            content: `ℹ️ 이미 가입 신청이 처리 중입니다.\n\n**조직**: ${result.organization.name.value}\n**상태**: ${status}`,
          });
        }
      }
    } catch (error) {
      console.error('Error handling organization join:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      if (errorMessage.includes('not found')) {
        await interaction.editReply({
          content: '❌ 조직을 찾을 수 없습니다. 슬러그를 확인해주세요.',
        });
      } else if (errorMessage.includes('Member with Discord ID')) {
        await interaction.editReply({
          content: '❌ 먼저 `/member create` 명령어로 회원 등록을 해주세요.',
        });
      } else {
        await interaction.editReply({
          content: `❌ 조직 가입 중 오류가 발생했습니다: ${errorMessage}`,
        });
      }
    }
  }
}
