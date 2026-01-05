import { injectable, inject } from 'inversify';
import {
  ICycleRepository,
  IMemberRepository,
  ISubmissionRepository,
} from '../../../domain';
import { CycleId } from '../../../domain/shared';
import { NotFoundException } from '../../../domain/shared';
import { TYPES } from '../../../../di/tokens';

export interface SubmissionSummary {
  total: number;
  submitted: number;
  notSubmitted: number;
}

export interface SubmittedInfo {
  memberId: number;
  memberName: string;
  url: string;
  submittedAt: Date;
}

export interface SubmissionStatus {
  cycleId: number;
  cycleName: string;
  generationId: number;
  summary: SubmissionSummary;
  submitted: SubmittedInfo[];
  notSubmitted: { memberId: number; memberName: string }[];
  deadline: Date;
}

@injectable()
export class FindSubmissionStatusUseCase {
  constructor(
    @inject(TYPES.CycleRepository)
    private readonly cycleRepo: ICycleRepository,
    @inject(TYPES.MemberRepository)
    private readonly memberRepo: IMemberRepository,
    @inject(TYPES.SubmissionRepository)
    private readonly submissionRepo: ISubmissionRepository
  ) {}

  async execute(cycleId: number): Promise<SubmissionStatus> {
    const id = new CycleId(cycleId);

    const cycle = await this.cycleRepo.findById(id);
    if (!cycle) {
      throw new NotFoundException('Cycle', String(cycleId));
    }

    const members = await this.memberRepo.findMembersByGeneration(
      cycle.generationId
    );
    const submissions = await this.submissionRepo.findByCycle(id);

    const submittedMemberIds = new Set(
      submissions.map((s) => s.memberId.value)
    );

    const submitted: SubmittedInfo[] = submissions.map((s) => {
      const member = members.find((m) => m.id.value === s.memberId.value);
      return {
        memberId: s.memberId.value,
        memberName: member?.name.value || 'Unknown',
        url: s.blogUrl.value,
        submittedAt: s.submittedAt,
      };
    });

    const notSubmitted = members
      .filter((m) => !submittedMemberIds.has(m.id.value))
      .map((m) => ({
        memberId: m.id.value,
        memberName: m.name.value,
      }));

    return {
      cycleId: cycle.id.value,
      cycleName: cycle.getCycleName(),
      generationId: cycle.generationId.value,
      summary: {
        total: members.length,
        submitted: submitted.length,
        notSubmitted: notSubmitted.length,
      },
      submitted,
      notSubmitted,
      deadline: cycle.getDeadline(),
    };
  }
}
