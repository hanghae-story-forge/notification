import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { CreateMemberCommand as AppCreateMemberCommand } from '@/application/commands';
import { MemberRepository } from '@/domain/member/member.repository';
import { DiscordCommand } from './types';

export class CreateMemberCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('create-member')
    .setDescription('새로운 회원을 생성합니다 (어떤 조직에도 속하지 않은 회원)')
    .addStringOption((option) =>
      option.setName('name').setDescription('회원의 실제 이름').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('github').setDescription('GitHub 사용자명 (선택사항)').setRequired(false)
    );

  constructor(
    private readonly createMemberCommand: AppCreateMemberCommand,
    private readonly memberRepo: MemberRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const name = interaction.options.getString('name', true);
      const githubUsername = interaction.options.getString('github', false);

      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const discordId = interaction.user.id;
      const discordUsername = interaction.user.username;
      const discordAvatar = interaction.user.avatar;

      const result = await this.createMemberCommand.execute({
        githubUsername: githubUsername ?? '',
        name,
        discordId,
      });

      const member = result.member;
      member.updateDiscordUsername(discordUsername);
      if (discordAvatar) {
        member.updateDiscordAvatar(discordAvatar);
      }
      await this.memberRepo.save(member);

      await interaction.editReply({
        content: `✅ 회원이 생성되었습니다!\n\n**이름**: ${name}\n**Discord**: ${discordUsername}\n**GitHub**: ${githubUsername || '미연동'}\n\n조직에 가입하려면 조직 관리자에게 문의하세요.`,
      });
    } catch (error) {
      console.error('Error handling create-member command:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      if (errorMessage.includes('이미 존재')) {
        await interaction.editReply({
          content: '❌ 이미 등록된 회원입니다.',
        });
      } else {
        await interaction.editReply({
          content: `❌ 회원 생성 중 오류가 발생했습니다: ${errorMessage}`,
        });
      }
    }
  }
}
