import { SubmissionId } from '../shared';
import { Submission } from './submission.entity';
import { CycleId, MemberId } from '../shared';

export abstract class ISubmissionRepository {
  abstract save(submission: Submission): Promise<Submission>;
  abstract findById(id: SubmissionId): Promise<Submission | null>;
  abstract findByCycle(cycleId: CycleId): Promise<Submission[]>;
  abstract findByCycleAndMember(
    cycleId: CycleId,
    memberId: MemberId
  ): Promise<Submission[]>;
  abstract findByMember(memberId: MemberId): Promise<Submission[]>;
  abstract delete(id: SubmissionId): Promise<void>;
  abstract existsByCycleAndMember(
    cycleId: CycleId,
    memberId: MemberId
  ): Promise<boolean>;
}
