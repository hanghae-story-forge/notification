import {
  SubmissionId,
  CycleId,
  MemberId,
  BlogUrl,
  GitHubCommentId,
} from '../shared';

export class Submission {
  constructor(
    private readonly _id: SubmissionId,
    private readonly _cycleId: CycleId,
    private readonly _memberId: MemberId,
    private readonly _blogUrl: BlogUrl,
    private readonly _githubCommentId: GitHubCommentId | null,
    private readonly _submittedAt: Date
  ) {}

  get id(): SubmissionId {
    return this._id;
  }

  get cycleId(): CycleId {
    return this._cycleId;
  }

  get memberId(): MemberId {
    return this._memberId;
  }

  get blogUrl(): BlogUrl {
    return this._blogUrl;
  }

  get githubCommentId(): GitHubCommentId | null {
    return this._githubCommentId;
  }

  get submittedAt(): Date {
    return this._submittedAt;
  }

  static create(
    cycleId: CycleId,
    memberId: MemberId,
    blogUrl: BlogUrl,
    githubCommentId: GitHubCommentId | null = null
  ): Submission {
    return new Submission(
      SubmissionId.create(),
      cycleId,
      memberId,
      blogUrl,
      githubCommentId,
      new Date()
    );
  }
}
