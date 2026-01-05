import { injectable, inject } from 'inversify';
import {
  IMemberRepository,
  ICycleRepository,
  ISubmissionRepository,
} from '@core/domain';
import { INotificationService, IGitHubParserService } from '@core/application/ports/services';
import { Submission, BlogUrl, GitHubCommentId } from '@core/domain/submission';
import { GitHubUsername, NotFoundException, GitHubIssueUrl } from '@core/domain/shared';
import { TYPES } from '@/di/tokens';

interface CreateSubmissionRequest {
  commentData: unknown;
}

interface CreateSubmissionResponse {
  submissionId: number;
  memberName: string;
  blogUrl: string;
  submittedAt: Date;
}

@injectable()
export class CreateSubmissionUseCase {
  constructor(
    @inject(TYPES.MemberRepository)
    private readonly memberRepo: IMemberRepository,
    @inject(TYPES.CycleRepository)
    private readonly cycleRepo: ICycleRepository,
    @inject(TYPES.SubmissionRepository)
    private readonly submissionRepo: ISubmissionRepository,
    @inject(TYPES.NotificationService)
    private readonly notificationService: INotificationService,
    @inject(TYPES.GitHubParserService)
    private readonly githubParserService: IGitHubParserService
  ) {}

  async execute(request: CreateSubmissionRequest): Promise<CreateSubmissionResponse> {
    // 1. Parse GitHub webhook data
    const parsedData = await this.githubParserService.parseComment(request.commentData);

    // 2. Find member by GitHub username
    const member = await this.memberRepo.findByGitHub(
      new GitHubUsername(parsedData.githubUsername)
    );
    if (!member) {
      throw new NotFoundException('Member', parsedData.githubUsername);
    }

    // 3. Find cycle by issue URL
    const cycle = await this.cycleRepo.findByGitHubIssueUrl(
      new GitHubIssueUrl(parsedData.issueUrl)
    );
    if (!cycle) {
      throw new NotFoundException('Cycle', parsedData.issueUrl);
    }

    // 4. Check for duplicate submission
    const existingSubmissions = await this.submissionRepo.findByCycleAndMember(
      cycle.id,
      member.id
    );
    if (existingSubmissions.length > 0) {
      // Return early if already submitted (idempotent)
      return {
        submissionId: existingSubmissions[0].id.value,
        memberName: member.name.value,
        blogUrl: existingSubmissions[0].blogUrl.value,
        submittedAt: existingSubmissions[0].submittedAt,
      };
    }

    // 5. Create submission entity
    const submission = Submission.create(
      cycle.id,
      member.id,
      new BlogUrl(parsedData.blogUrl),
      new GitHubCommentId(parsedData.commentId)
    );

    // 6. Save submission
    await this.submissionRepo.save(submission);

    // 7. Send notification
    await this.notificationService.notifySubmissionCreated({
      memberName: member.name.value,
      blogUrl: submission.blogUrl.value,
      cycleName: cycle.getCycleName(),
    });

    return {
      submissionId: submission.id.value,
      memberName: member.name.value,
      blogUrl: submission.blogUrl.value,
      submittedAt: submission.submittedAt,
    };
  }
}
