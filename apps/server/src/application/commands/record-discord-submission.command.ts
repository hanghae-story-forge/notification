import { CycleRepository } from '@/domain/cycle/cycle.repository';
import { GenerationId } from '@/domain/generation/generation.domain';
import { GenerationRepository } from '@/domain/generation/generation.repository';
import { ForbiddenError, NotFoundError } from '@/domain/common/errors';
import { MemberRepository } from '@/domain/member/member.repository';
import { OrganizationRepository } from '@/domain/organization/organization.repository';
import { OrganizationMemberRepository } from '@/domain/organization-member/organization-member.repository';
import {
  CycleId as SubmissionCycleId,
  MemberId as SubmissionMemberId,
  Submission,
} from '@/domain/submission/submission.domain';
import { SubmissionRepository } from '@/domain/submission/submission.repository';
import { SubmissionService } from '@/domain/submission/submission.service';

export interface RecordDiscordSubmissionRequest {
  discordUserId: string;
  organizationSlug: string;
  blogUrl: string;
}

export interface RecordDiscordSubmissionResult {
  memberName: string;
  generationName: string;
  cycleWeek: number;
  cycleId: number;
  organizationSlug: string;
  submittedUrl: string;
  statusPath: string;
}

export class RecordDiscordSubmissionCommand {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly memberRepo: MemberRepository,
    private readonly cycleRepo: CycleRepository,
    private readonly generationRepo: GenerationRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly submissionService: SubmissionService
  ) {}

  async execute(
    request: RecordDiscordSubmissionRequest
  ): Promise<RecordDiscordSubmissionResult> {
    const organization = await this.organizationRepo.findBySlug(
      request.organizationSlug
    );
    if (!organization) {
      throw new NotFoundError('Organization', request.organizationSlug);
    }

    const member = await this.memberRepo.findByDiscordId(request.discordUserId);
    if (!member) {
      throw new NotFoundError('Member', `discord=${request.discordUserId}`);
    }

    const isActiveMember = await this.organizationMemberRepo.isActiveMember(
      organization.id,
      member.id
    );
    if (!isActiveMember) {
      throw new ForbiddenError(
        'Member is not an approved member of the organization'
      );
    }

    const activeCycles = await this.cycleRepo.findActiveCyclesByOrganization(
      organization.id.value
    );
    const cycle = activeCycles[0];
    if (!cycle) {
      throw new NotFoundError('Active cycle', request.organizationSlug);
    }

    const generation = await this.generationRepo.findById(
      GenerationId.create(cycle.generationId)
    );
    if (!generation) {
      throw new NotFoundError('Generation', `id=${cycle.generationId}`);
    }

    const syntheticCommentId = this.createDiscordSubmissionSourceId(
      cycle.id.value,
      member.id.value,
      request.blogUrl
    );

    await this.submissionService.validateSubmission(
      SubmissionCycleId.create(cycle.id.value),
      SubmissionMemberId.create(member.id.value),
      syntheticCommentId
    );

    const submission = Submission.create({
      cycleId: cycle.id.value,
      memberId: member.id.value,
      url: request.blogUrl,
      githubCommentId: syntheticCommentId,
      submittedAt: new Date(),
    });

    await this.submissionRepo.save(submission);

    return {
      memberName: member.name.value,
      generationName: generation.name,
      cycleWeek: cycle.week.toNumber(),
      cycleId: cycle.id.value,
      organizationSlug: organization.slug.value,
      submittedUrl: request.blogUrl,
      statusPath: `/api/status/${cycle.id.value}?organizationSlug=${organization.slug.value}`,
    };
  }

  private createDiscordSubmissionSourceId(
    cycleId: number,
    memberId: number,
    blogUrl: string
  ): string {
    return `discord:${cycleId}:${memberId}:${blogUrl}`;
  }
}
