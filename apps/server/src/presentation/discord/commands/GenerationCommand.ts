import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JoinGenerationCommand as AppJoinGenerationCommand } from '@/application/commands';
import { MemberRepository } from '@/domain/member/member.repository';
import { GenerationRepository } from '@/domain/generation/generation.repository';
import { OrganizationRepository } from '@/domain/organization/organization.repository';
import { GenerationMemberRepository } from '@/domain/generation-member/generation-member.repository';
import { CycleRepository } from '@/domain/cycle/cycle.repository';
import { DiscordCommand } from './types';

export class GenerationCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('generation')
    .setDescription('기수 관련 명령어')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('join')
        .setDescription('기수에 참여합니다 (조직원만 가능)')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('기수 이름 (예: 똥글똥글 1기)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('current').setDescription('현재 활성화된 기수 정보를 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('기수 참여 현황을 확인합니다')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('기수 이름 (예: 똥글똥글 1기)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('등록된 모든 기수 목록을 확인합니다')
    );

  constructor(
    private readonly joinGenerationCommand: AppJoinGenerationCommand,
    private readonly memberRepo: MemberRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly organizationRepo: OrganizationRepository,
    private readonly generationMemberRepo: GenerationMemberRepository,
    private readonly cycleRepo: CycleRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'join') {
      await this.handleJoin(interaction);
    } else if (subcommand === 'current') {
      await this.handleCurrent(interaction);
    } else if (subcommand === 'status') {
      await this.handleStatus(interaction);
    } else if (subcommand === 'list') {
      await this.handleList(interaction);
    }
  }

  private async handleJoin(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const generationName = interaction.options.getString('name', true);

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
          content: '❌ 먼저 `/member create` 명령어로 회원 등록을 해주세요.',
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
      console.error('Error handling generation join:', error);
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

  private async handleCurrent(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      // 활성화된 조직 찾기
      const activeOrgs = await this.organizationRepo.findActive();
      if (!activeOrgs || activeOrgs.length === 0) {
        await interaction.editReply({
          content: '❌ 활성화된 조직이 없습니다.',
        });
        return;
      }

      // 첫 번째 활성화된 조직의 현재 기수 찾기
      const currentGeneration = await this.generationRepo.findActiveByOrganization(
        activeOrgs[0].id.value
      );

      if (!currentGeneration) {
        await interaction.editReply({
          content: '❌ 현재 진행 중인 기수가 없습니다.',
        });
        return;
      }

      // 기수의 주차 수 확인
      const cycles = await this.cycleRepo.findByGeneration(
        currentGeneration.id.value
      );

      // 기수원 수 확인
      const generationMembers = await this.generationMemberRepo.findByGeneration(
        currentGeneration.id.value
      );

      await interaction.editReply({
        content:
          `📅 **현재 기수 정보**\n\n` +
          `**기수명**: ${currentGeneration.name}\n` +
          `**조직**: ${activeOrgs[0].name.value}\n` +
          `**참여자**: ${generationMembers.length}명\n` +
          `**진행 주차**: ${cycles.length}주차\n` +
          `**시작일**: ${new Date(currentGeneration.startedAt).toLocaleDateString('ko-KR')}`,
      });
    } catch (error) {
      console.error('Error handling generation current:', error);
      await interaction.editReply({
        content: '❌ 기수 정보 조회 중 오류가 발생했습니다.',
      });
    }
  }

  private async handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const generationName = interaction.options.getString('name', true);

      // 기수 찾기
      const generations = await this.generationRepo.findAll();
      const generation = generations.find((g) => g.name === generationName);
      if (!generation) {
        await interaction.editReply({
          content: `❌ "${generationName}" 기수를 찾을 수 없습니다.`,
        });
        return;
      }

      // 기수원 목록 가져오기
      const generationMembers = await this.generationMemberRepo.findByGeneration(
        generation.id.value
      );

      // 기수원의 멤버 정보 가져오기
      const memberDetails = await Promise.all(
        generationMembers.map(async (gm) => {
          const member = await this.memberRepo.findById(gm.memberId);
          return member;
        })
      );

      const memberNames = memberDetails
        .filter((m) => m !== null)
        .map((m) => m!.name.value);

      // 주차 정보 가져오기
      const cycles = await this.cycleRepo.findByGeneration(generation.id.value);

      await interaction.editReply({
        content:
          `📊 **${generation.name} 참여 현황**\n\n` +
          `**참여자** (${memberNames.length}명):\n` +
          (memberNames.length > 0
            ? memberNames.map((name) => `  ✅ ${name}`).join('\n')
            : '  없음') +
          `\n\n**진행 주차**: ${cycles.length}주차\n` +
          `**시작일**: ${new Date(generation.startedAt).toLocaleDateString('ko-KR')}`,
      });
    } catch (error) {
      console.error('Error handling generation status:', error);
      await interaction.editReply({
        content: '❌ 기수 현황 조회 중 오류가 발생했습니다.',
      });
    }
  }

  private async handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const allGenerations = await this.generationRepo.findAll();

      if (allGenerations.length === 0) {
        await interaction.editReply({
          content: '📋 등록된 기수가 없습니다.',
        });
        return;
      }

      let message = `📋 **기수 목록** (총 ${allGenerations.length}개)\n\n`;

      for (const generation of allGenerations) {
        const cycles = await this.cycleRepo.findByGeneration(generation.id.value);
        const generationMembers = await this.generationMemberRepo.findByGeneration(
          generation.id.value
        );

        message += `**${generation.name}**\n`;
        message += `   참여자: ${generationMembers.length}명 | `;
        message += `진행 주차: ${cycles.length}주차\n`;
        message += `   시작일: ${new Date(generation.startedAt).toLocaleDateString('ko-KR')}\n\n`;
      }

      await interaction.editReply({
        content: message,
      });
    } catch (error) {
      console.error('Error handling generation list:', error);
      await interaction.editReply({
        content: '❌ 기수 목록 조회 중 오류가 발생했습니다.',
      });
    }
  }
}
