export interface SubmissionNotificationData {
  memberName: string;
  blogUrl: string;
  cycleName: string;
}

export interface ReminderNotificationData {
  cycleName: string;
  deadline: Date;
  notSubmitted: string[];
}

export interface StatusNotificationData {
  cycleName: string;
  submitted: string[];
  notSubmitted: string[];
  deadline: Date;
}

export interface INotificationService {
  notifySubmissionCreated(data: SubmissionNotificationData): Promise<void>;
  notifyReminder(data: ReminderNotificationData): Promise<void>;
  notifyStatus(data: StatusNotificationData): Promise<void>;
}
