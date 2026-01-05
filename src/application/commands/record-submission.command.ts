// RecordSubmissionCommand - 제출 기록 Command

import { Submission } from '../../domain/submission/submission.domain';
import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { SubmissionRepository } from '../../domain/submission/submission.repository';
import { SubmissionService } from '../../domain/submission/submission.service';
import { NotFoundError } from '../../domain/common/errors';

/**
 * 제출 기록 Command 요청 데이터
 */
export interface RecordSubmissionRequest {
  githubUsername: string;
  blogUrl: string;
  githubCommentId: string;
  githubIssueUrl: string;
}

/**
 * 제출 기록 Command 결과
 */
export interface RecordSubmissionResult {
  submission: Submission;
  memberName: string;
  cycleName: string;
}

/**
 * 제출 기록 Command (Use Case)
 *
 * 책임:
 * 1. GitHub Issue URL에 해당하는 Cycle을 찾는다
 * 2. GitHub Username으로 Member를 찾는다
 * 3. 제출 가능 여부를 검증한다
 * 4. Submission을 생성하고 저장한다
 * 5. 도메인 이벤트를 발행한다 (Discord 알림 등)
 */
export class RecordSubmissionCommand {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly memberRepo: MemberRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly submissionService: SubmissionService
  ) {}

  async execute(
    request: RecordSubmissionRequest
  ): Promise<RecordSubmissionResult> {
    // 1. Cycle 찾기
    const cycle = await this.cycleRepo.findByIssueUrl(request.githubIssueUrl);
    if (!cycle) {
      throw new NotFoundError('Cycle', `issueUrl=${request.githubIssueUrl}`);
    }

    // 2. Member 찾기
    const member = await this.memberRepo.findByGithubUsername(
      request.githubUsername
    );
    if (!member) {
      throw new NotFoundError('Member', `github=${request.githubUsername}`);
    }

    // 3. 제출 가능 여부 검증
    await this.submissionService.validateSubmission(
      cycle.id,
      member.id,
      request.githubCommentId
    );

    // 4. Submission 생성
    const submission = Submission.create({
      cycleId: cycle.id.value,
      memberId: member.id.value,
      url: request.blogUrl,
      githubCommentId: request.githubCommentId,
      submittedAt: new Date(),
    });

    // 5. 저장
    await this.submissionRepo.save(submission);

    // 6. 결과 반환 (핸들러에서 Discord 알림 등 추가 작업 수행)
    return {
      submission,
      memberName: member.name.value,
      cycleName: `${cycle.week}주차`,
    };
  }
}
