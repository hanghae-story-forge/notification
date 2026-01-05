export const TYPES = {
  // Repositories
  MemberRepository: Symbol.for('MemberRepository'),
  CycleRepository: Symbol.for('CycleRepository'),
  SubmissionRepository: Symbol.for('SubmissionRepository'),
  GenerationRepository: Symbol.for('GenerationRepository'),

  // Services
  NotificationService: Symbol.for('NotificationService'),
  GitHubParserService: Symbol.for('GitHubParserService'),

  // Use Cases
  CreateSubmissionUseCase: Symbol.for('CreateSubmissionUseCase'),
  FindSubmissionStatusUseCase: Symbol.for('FindSubmissionStatusUseCase'),
  FindUpcomingDeadlinesUseCase: Symbol.for('FindUpcomingDeadlinesUseCase'),
  HandleGitHubIssueCreatedUseCase: Symbol.for('HandleGitHubIssueCreatedUseCase'),
  SendReminderNotificationUseCase: Symbol.for('SendReminderNotificationUseCase'),
};
