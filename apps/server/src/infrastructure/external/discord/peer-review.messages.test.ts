import { describe, expect, it } from 'vitest';
import {
  createPeerReviewDoneMessage,
  createPeerReviewMyAssignmentMessage,
  createPeerReviewNoAssignmentMessage,
  createPeerReviewStatusMessage,
  createPeerReviewTemplateMessage,
} from './peer-review.messages';

describe('peer review Discord messages', () => {
  it('creates a 3rd generation submission and review template that lowers review pressure', () => {
    const message = createPeerReviewTemplateMessage();

    expect(message.content).toContain('3기 제출 템플릿');
    expect(message.content).toContain('제목');
    expect(message.content).toContain('소개 / 소감');
    expect(message.content).toContain('스스로의 만족도');
    expect(message.content).toContain('평가나 채점이 아니라');
    expect(message.content).toContain('2~5문장');
  });

  it('creates a private assignment guide with the assigned article and next action', () => {
    const message = createPeerReviewMyAssignmentMessage({
      cycleName: '똥글똥글 3기 1회차',
      revieweeName: '윤영서',
      submissionUrl: 'https://example.com/post',
    });

    expect(message.content).toContain('똥글똥글 3기 1회차');
    expect(message.content).toContain('윤영서');
    expect(message.content).toContain('https://example.com/post');
    expect(message.content).toContain('/review done');
    expect(message.ephemeral).toBe(true);
  });

  it('creates an actionable no-assignment message', () => {
    const message = createPeerReviewNoAssignmentMessage({
      cycleName: '똥글똥글 3기 1회차',
    });

    expect(message.content).toContain('아직 배정된 글이 없어요');
    expect(message.content).toContain('/review assign');
    expect(message.ephemeral).toBe(true);
  });

  it('summarizes peer review status without shaming pending reviewers', () => {
    const message = createPeerReviewStatusMessage({
      cycleName: '똥글똥글 3기 1회차',
      total: 5,
      completed: 3,
      pending: 2,
      skipped: 0,
      cancelled: 0,
    });

    expect(message.content).toContain('감상평 현황');
    expect(message.content).toContain('3 / 5');
    expect(message.content).toContain('남은 감상평: 2개');
    expect(message.content).not.toContain('미완료자');
  });

  it('confirms completion and frames the review as human communication', () => {
    const message = createPeerReviewDoneMessage({
      cycleName: '똥글똥글 3기 1회차',
    });

    expect(message.content).toContain('완료로 기록했어요');
    expect(message.content).toContain('서로 읽어주는 흐름');
    expect(message.ephemeral).toBe(true);
  });
});
