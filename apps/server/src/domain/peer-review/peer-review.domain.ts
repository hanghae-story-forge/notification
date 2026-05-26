export type PeerReviewAssignmentStatus =
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export class PeerReviewDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PeerReviewDomainError';
  }
}

export interface PeerReviewCandidate {
  memberId: number;
  submissionId: number;
  submittedAt: Date;
}

export interface PeerReviewAssignmentProps {
  id?: number;
  cycleId: number;
  reviewerMemberId: number;
  revieweeMemberId: number;
  submissionId: number;
  status?: PeerReviewAssignmentStatus;
  assignedAt?: Date;
  completedAt?: Date;
  completedSourceUrl?: string;
  completionNote?: string;
  skippedAt?: Date;
  skipReason?: string;
  cancelledAt?: Date;
}

export interface CompletePeerReviewAssignmentProps {
  completedAt?: Date;
  completedSourceUrl?: string;
  completionNote?: string;
}

export interface SkipPeerReviewAssignmentProps {
  skippedAt?: Date;
  skipReason?: string;
}

export class PeerReviewAssignment {
  readonly id?: number;
  readonly cycleId: number;
  readonly reviewerMemberId: number;
  readonly revieweeMemberId: number;
  readonly submissionId: number;
  readonly assignedAt: Date;
  private _status: PeerReviewAssignmentStatus;
  private _completedAt?: Date;
  private _completedSourceUrl?: string;
  private _completionNote?: string;
  private _skippedAt?: Date;
  private _skipReason?: string;
  private _cancelledAt?: Date;

  private constructor(props: RequiredPeerReviewAssignmentProps) {
    this.id = props.id;
    this.cycleId = props.cycleId;
    this.reviewerMemberId = props.reviewerMemberId;
    this.revieweeMemberId = props.revieweeMemberId;
    this.submissionId = props.submissionId;
    this.assignedAt = props.assignedAt;
    this._status = props.status;
    this._completedAt = props.completedAt;
    this._completedSourceUrl = props.completedSourceUrl;
    this._completionNote = props.completionNote;
    this._skippedAt = props.skippedAt;
    this._skipReason = props.skipReason;
    this._cancelledAt = props.cancelledAt;
  }

  static create(props: PeerReviewAssignmentProps): PeerReviewAssignment {
    if (props.cycleId < 1) {
      throw new PeerReviewDomainError('cycleId must be positive');
    }
    if (props.reviewerMemberId < 1) {
      throw new PeerReviewDomainError('reviewerMemberId must be positive');
    }
    if (props.revieweeMemberId < 1) {
      throw new PeerReviewDomainError('revieweeMemberId must be positive');
    }
    if (props.submissionId < 1) {
      throw new PeerReviewDomainError('submissionId must be positive');
    }
    if (props.reviewerMemberId === props.revieweeMemberId) {
      throw new PeerReviewDomainError('Reviewer cannot review their own post');
    }

    return new PeerReviewAssignment({
      id: props.id,
      cycleId: props.cycleId,
      reviewerMemberId: props.reviewerMemberId,
      revieweeMemberId: props.revieweeMemberId,
      submissionId: props.submissionId,
      status: props.status ?? 'ASSIGNED',
      assignedAt: props.assignedAt ?? new Date(),
      completedAt: props.completedAt,
      completedSourceUrl: props.completedSourceUrl,
      completionNote: props.completionNote,
      skippedAt: props.skippedAt,
      skipReason: props.skipReason,
      cancelledAt: props.cancelledAt,
    });
  }

  get status(): PeerReviewAssignmentStatus {
    return this._status;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get completedSourceUrl(): string | undefined {
    return this._completedSourceUrl;
  }

  get completionNote(): string | undefined {
    return this._completionNote;
  }

  get skippedAt(): Date | undefined {
    return this._skippedAt;
  }

  get skipReason(): string | undefined {
    return this._skipReason;
  }

  get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }

  complete(props: CompletePeerReviewAssignmentProps = {}): void {
    if (this._status !== 'ASSIGNED') {
      throw new PeerReviewDomainError('Only assigned reviews can be completed');
    }
    this._status = 'COMPLETED';
    this._completedAt = props.completedAt ?? new Date();
    this._completedSourceUrl = props.completedSourceUrl;
    this._completionNote = props.completionNote;
  }

  skip(props: SkipPeerReviewAssignmentProps = {}): void {
    if (this._status !== 'ASSIGNED') {
      throw new PeerReviewDomainError('Only assigned reviews can be skipped');
    }
    this._status = 'SKIPPED';
    this._skippedAt = props.skippedAt ?? new Date();
    this._skipReason = props.skipReason;
  }

  cancel(cancelledAt = new Date()): void {
    if (this._status === 'COMPLETED') {
      throw new PeerReviewDomainError('Completed reviews cannot be cancelled');
    }
    this._status = 'CANCELLED';
    this._cancelledAt = cancelledAt;
  }
}

type RequiredPeerReviewAssignmentProps = Required<
  Pick<
    PeerReviewAssignmentProps,
    | 'cycleId'
    | 'reviewerMemberId'
    | 'revieweeMemberId'
    | 'submissionId'
    | 'status'
    | 'assignedAt'
  >
> &
  Pick<
    PeerReviewAssignmentProps,
    | 'id'
    | 'completedAt'
    | 'completedSourceUrl'
    | 'completionNote'
    | 'skippedAt'
    | 'skipReason'
    | 'cancelledAt'
  >;

export function generatePeerReviewAssignments(input: {
  cycleId: number;
  seed: string;
  candidates: PeerReviewCandidate[];
}): PeerReviewAssignment[] {
  const candidates = selectEarliestSubmissionPerMember(input.candidates);
  if (candidates.length < 2) {
    throw new PeerReviewDomainError(
      'At least two distinct submitters are required for peer review assignment'
    );
  }

  const shuffled = seededShuffle(candidates, input.seed);
  return shuffled.map((reviewer, index) => {
    const reviewee = shuffled[(index + 1) % shuffled.length];
    return PeerReviewAssignment.create({
      cycleId: input.cycleId,
      reviewerMemberId: reviewer.memberId,
      revieweeMemberId: reviewee.memberId,
      submissionId: reviewee.submissionId,
    });
  });
}

function selectEarliestSubmissionPerMember(
  candidates: PeerReviewCandidate[]
): PeerReviewCandidate[] {
  const byMember = new Map<number, PeerReviewCandidate>();
  for (const candidate of candidates) {
    const current = byMember.get(candidate.memberId);
    if (
      !current ||
      candidate.submittedAt.getTime() < current.submittedAt.getTime()
    ) {
      byMember.set(candidate.memberId, candidate);
    }
  }

  return [...byMember.values()].sort((a, b) => a.memberId - b.memberId);
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let state = hashSeed(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = nextRandomState(state);
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandomState(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}
