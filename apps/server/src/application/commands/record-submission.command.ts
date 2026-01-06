// RecordSubmissionCommand - 제출 기록 Command

import { Submission } from '../../domain/submission/submission.domain';
import { CycleRepository } from '../../domain/cycle/cycle.repository';
import { MemberRepository } from '../../domain/member/member.repository';
import { SubmissionRepository } from '../../domain/submission/submission.repository';
import { OrganizationMemberRepository } from '../../domain/organization-member/organization-member.repository';
import { GenerationRepository } from '../../domain/generation/generation.repository';
import { GenerationId } from '../../domain/generation/generation.domain';
import { OrganizationId } from '../../domain/organization/organization.domain';
import { SubmissionService } from '../../domain/submission/submission.service';
import { NotFoundError, ForbiddenError } from '../../domain/common/errors';

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
  organizationSlug: string; // 조직 식별자 추가
}

/**
 * 제출 기록 Command (Use Case)
 *
 * 책임:
 * 1. GitHub Issue URL에 해당하는 Cycle을 찾는다
 * 2. Cycle이 속한 Generation을 찾는다
 * 3. Generation이 속한 Organization을 찾는다
 * 4. GitHub Username으로 Member를 찾는다
 * 5. Member가 해당 Organization의 활성 멤버인지 확인한다
 * 6. 제출 가능 여부를 검증한다
 * 7. Submission을 생성하고 저장한다
 * 8. 도메인 이벤트를 발행한다 (Discord 알림 등)
 */
export class RecordSubmissionCommand {
  constructor(
    private readonly cycleRepo: CycleRepository,
    private readonly memberRepo: MemberRepository,
    private readonly submissionRepo: SubmissionRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly generationRepo: GenerationRepository,
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

    // 2. Generation 찾기 (Cycle의 organizationId 확인용)
    const generation = await this.generationRepo.findById(
      GenerationId.create(cycle.generationId)
    );
    if (!generation) {
      throw new NotFoundError('Generation', `id=${cycle.generationId}`);
    }

    // 3. Organization 찾기 (Discord webhook 등에서 사용)
    const organizationId = generation.organizationId;
    const organizationIdObj = OrganizationId.create(organizationId);

    // 4. Member 찾기 (GitHub username으로)
    const member = await this.memberRepo.findByGithubUsername(
      request.githubUsername
    );
    if (!member) {
      throw new NotFoundError('Member', `github=${request.githubUsername}`);
    }

    // 5. Member가 해당 Organization의 활성 멤버인지 확인
    const isActiveMember = await this.organizationMemberRepo.isActiveMember(
      organizationIdObj,
      member.id
    );
    if (!isActiveMember) {
      throw new ForbiddenError(
        `Member is not an active member of the organization`
      );
    }

    // 6. 제출 가능 여부 검증
    await this.submissionService.validateSubmission(
      cycle.id,
      member.id,
      request.githubCommentId
    );

    // 7. Submission 생성
    const submission = Submission.create({
      cycleId: cycle.id.value,
      memberId: member.id.value,
      url: request.blogUrl,
      githubCommentId: request.githubCommentId,
      submittedAt: new Date(),
    });

    // 8. 저장
    await this.submissionRepo.save(submission);

    // 9. 결과 반환 (핸들러에서 Discord 알림 등 추가 작업 수행)
    return {
      submission,
      memberName: member.name.value,
      cycleName: `${cycle.week}주차`,
      organizationSlug: `org-${organizationId}`, // 임시 slug, 실제로는 organization 테이블에서 조회 필요
    };
  }
}
