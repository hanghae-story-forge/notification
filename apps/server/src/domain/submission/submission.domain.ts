// Submission Domain Entity - 제출 도메인 엔티티

import { AggregateRoot, EntityId } from '../common/types';
import { BlogUrl, GithubCommentId } from './submission.vo';

// Submission ID
export class SubmissionId extends EntityId {
  static create(value: number): SubmissionId {
    return new SubmissionId(value);
  }
}

// Member ID (Value Object - 외부 참조)
export class MemberId extends EntityId {
  static create(value: number): MemberId {
    return new MemberId(value);
  }
}

// Cycle ID (Value Object - 외부 참조)
export class CycleId extends EntityId {
  static create(value: number): CycleId {
    return new CycleId(value);
  }
}

// 도메인 이벤트
export class SubmissionRecordedEvent {
  readonly type = 'SubmissionRecorded' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly submissionId: SubmissionId,
    public readonly memberId: MemberId,
    public readonly cycleId: CycleId,
    public readonly url: BlogUrl
  ) {
    this.occurredAt = new Date();
  }
}

// 제출 생성 데이터
export interface CreateSubmissionData {
  id?: number; // Optional for new submissions
  cycleId: number;
  memberId: number;
  url: string;
  submittedAt?: Date;
  githubCommentId: string;
}

// 제출 엔티티 (Aggregate Root)
export class Submission extends AggregateRoot<SubmissionId> {
  private constructor(
    id: SubmissionId,
    private readonly _cycleId: CycleId,
    private readonly _memberId: MemberId,
    private readonly _url: BlogUrl,
    private readonly _submittedAt: Date,
    private readonly _githubCommentId: GithubCommentId
  ) {
    super(id);
  }

  // 팩토리 메서드: 새 제출 생성
  static create(data: CreateSubmissionData): Submission {
    const blogUrl = BlogUrl.create(data.url);
    const commentId = GithubCommentId.create(data.githubCommentId);

    const id = data.id ? SubmissionId.create(data.id) : SubmissionId.create(0);
    const cycleId = CycleId.create(data.cycleId);
    const memberId = MemberId.create(data.memberId);
    const submittedAt = data.submittedAt ?? new Date();

    const submission = new Submission(
      id,
      cycleId,
      memberId,
      blogUrl,
      submittedAt,
      commentId
    );

    // 도메인 이벤트 발행
    submission.addDomainEvent(
      new SubmissionRecordedEvent(id, memberId, cycleId, blogUrl)
    );

    return submission;
  }

  // 팩토리 메서드: DB에서 조회한 엔티티 복원
  static reconstitute(data: {
    id: number;
    cycleId: number;
    memberId: number;
    url: string;
    submittedAt: Date;
    githubCommentId: string;
  }): Submission {
    const blogUrl = BlogUrl.create(data.url);
    const commentId = GithubCommentId.create(data.githubCommentId);

    return new Submission(
      SubmissionId.create(data.id),
      CycleId.create(data.cycleId),
      MemberId.create(data.memberId),
      blogUrl,
      data.submittedAt,
      commentId
    );
  }

  // Getters
  get cycleId(): CycleId {
    return this._cycleId;
  }

  get memberId(): MemberId {
    return this._memberId;
  }

  get url(): BlogUrl {
    return this._url;
  }

  get submittedAt(): Date {
    return new Date(this._submittedAt);
  }

  get githubCommentId(): GithubCommentId {
    return this._githubCommentId;
  }

  // 비즈니스 로직: 특정 회원의 제출인지 확인
  isSubmittedBy(memberId: MemberId): boolean {
    return this._memberId.equals(memberId);
  }

  // 비즈니스 로직: 특정 사이클의 제출인지 확인
  isForCycle(cycleId: CycleId): boolean {
    return this._cycleId.equals(cycleId);
  }

  // DTO로 변환 (외부 계층 전용)
  toDTO(): SubmissionDTO {
    return {
      id: this.id.value,
      cycleId: this._cycleId.value,
      memberId: this._memberId.value,
      url: this._url.value,
      submittedAt: this._submittedAt.toISOString(),
      githubCommentId: this._githubCommentId.value,
    };
  }
}

// DTO 타입
export interface SubmissionDTO {
  id: number;
  cycleId: number;
  memberId: number;
  url: string;
  submittedAt: string;
  githubCommentId: string;
}
