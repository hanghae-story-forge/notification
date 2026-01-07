import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JoinGenerationCommand as AppJoinGenerationCommand } from '@/application/commands';
import { MemberRepository } from '@/domain/member/member.repository';
import { GenerationRepository } from '@/domain/generation/generation.repository';
import { DiscordCommand } from './types';

export class JoinGenerationDiscordCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('join-generation')
    .setDescription('기수에 참여합니다 (조직원만 가능)')
    .addStringOption((option) =>
      option
        .setName('generation')
        .setDescription('기수 이름 (예: 똥글똥글 1기)')
        .setRequired(true)
        .setAutocomplete(true)
    );

  constructor(
    private readonly joinGenerationCommand: AppJoinGenerationCommand,
    private readonly memberRepo: MemberRepository,
    private readonly generationRepo: GenerationRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const generationName = interaction.options.getString('generation', true);

      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      // 사용자의 멤버 정보 확인
      const member = await this.memberRepo.findByDiscordId(interaction.user.id);
      if (!member) {
        await interaction.editReply({
          content: '❌ 먼저 `/register` 명령어로 회원 등록을 해주세요.',
        });
        return;
      }

      // 기수 찾기
      const generations = await this.generationRepo.findAll();
      const generation = generations.find((g) => g.name === generationName);
      if (!generation) {
        await interaction.editReply({
          content: '❌ 기수를 찾을 수 없습니다.',
        });
        return;
      }

      const result = await this.joinGenerationCommand.execute({
        generationId: generation.id.value,
        memberId: member.id.value,
      });

      if (result.isNew) {
        await interaction.editReply({
          content: `✅ 기수 참여가 완료되었습니다!\n\n**기수**: ${result.generation.name}\n**조직**: ${result.member.name.value}님`,
        });
      } else {
        await interaction.editReply({
          content: `ℹ️ 이미 참여 중인 기수입니다.\n\n**기수**: ${result.generation.name}`,
        });
      }
    } catch (error) {
      console.error('Error handling join-generation command:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      if (errorMessage.includes('must join organization')) {
        await interaction.editReply({
          content: '❌ 먼저 조직에 가입하고 승인을 받아야 합니다.',
        });
      } else if (errorMessage.includes('must be APPROVED')) {
        await interaction.editReply({
          content: '❌ 조직원 승인이 필요합니다. 관리자에게 문의해주세요.',
        });
      } else {
        await interaction.editReply({
          content: `❌ 기수 참여 중 오류가 발생했습니다: ${errorMessage}`,
        });
      }
    }
  }
}
