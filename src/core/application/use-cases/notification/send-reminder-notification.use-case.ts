import { injectable, inject } from 'inversify';
import { ICycleRepository, IMemberRepository, ISubmissionRepository } from '@core/domain';
import { INotificationService } from '@core/application/ports/services';
import { CycleId } from '@core/domain/shared';
import { TYPES } from '@/di/tokens';

@injectable()
export class SendReminderNotificationUseCase {
  constructor(
    @inject(TYPES.CycleRepository)
    private readonly cycleRepo: ICycleRepository,
    @inject(TYPES.MemberRepository)
    private readonly memberRepo: IMemberRepository,
    @inject(TYPES.SubmissionRepository)
    private readonly submissionRepo: ISubmissionRepository,
    @inject(TYPES.NotificationService)
    private readonly notificationService: INotificationService
  ) {}

  async execute(cycleId: number): Promise<void> {
    const id = new CycleId(cycleId);

    const cycle = await this.cycleRepo.findById(id);
    if (!cycle) {
      return;
    }

    const members = await this.memberRepo.findMembersByGeneration(
      cycle.generationId
    );
    const submissions = await this.submissionRepo.findByCycle(id);

    const submittedMemberIds = new Set(submissions.map((s) => s.memberId.value));

    const notSubmitted = members
      .filter((m) => !submittedMemberIds.has(m.id.value))
      .map((m) => m.name.value);

    if (notSubmitted.length === 0) {
      return;
    }

    await this.notificationService.notifyReminder({
      cycleName: cycle.getCycleName(),
      deadline: cycle.getDeadline(),
      notSubmitted,
    });
  }
}
