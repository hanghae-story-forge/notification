import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createReminderMessage,
  createStatusMessage,
  createSubmissionMessage,
  sendDiscordWebhook,
} from './discord.messages';

describe('Discord message UX', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns a submission notification into a clear confirmation with next action', () => {
    const message = createSubmissionMessage(
      '박준형',
      'https://blog.example.com/post',
      '똥글똥글 2기 7주차'
    );

    expect(message.content).toContain('박준형님 제출 완료');
    expect(message.embeds?.[0]?.title).toBe('똥글똥글 2기 7주차 제출 완료');
    expect(message.embeds?.[0]?.description).toContain('정상 기록됐어요');
    expect(message.embeds?.[0]?.description).toContain(
      '[글 보러가기](https://blog.example.com/post)'
    );
    expect(message.embeds?.[0]?.description).toContain('/cycle status');
  });

  it('makes reminder messages action-oriented for missing submitters', () => {
    vi.setSystemTime(new Date('2026-05-08T00:00:00.000Z'));
    const deadline = new Date('2026-05-09T03:00:00.000Z');

    const message = createReminderMessage('똥글똥글 2기 7주차', deadline, [
      '김항해',
      '박준형',
    ]);

    expect(message.content).toContain('미제출 2명');
    expect(message.embeds?.[0]?.title).toBe('똥글똥글 2기 7주차 제출 리마인더');
    expect(message.embeds?.[0]?.description).toContain('남은 시간: 1일 3시간');
    expect(message.embeds?.[0]?.description).toContain('아직 제출 전: 2명');
    expect(message.embeds?.[0]?.description).toContain('- 김항해');
    expect(message.embeds?.[0]?.description).toContain(
      'GitHub 이슈 댓글에 링크를 남깁니다'
    );
    expect(message.embeds?.[0]?.description).toContain('/me info');
  });

  it('formats reminders below one day in hours', () => {
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'));
    const deadline = new Date('2026-05-09T05:00:00.000Z');

    const message = createReminderMessage('똥글똥글 2기 7주차', deadline, [
      '박준형',
    ]);

    expect(message.embeds?.[0]?.description).toContain('남은 시간: 5시간');
  });

  it('shows reminders as due now when the deadline has passed', () => {
    vi.setSystemTime(new Date('2026-05-09T06:00:00.000Z'));
    const deadline = new Date('2026-05-09T05:00:00.000Z');

    const message = createReminderMessage('똥글똥글 2기 7주차', deadline, [
      '박준형',
    ]);

    expect(message.embeds?.[0]?.description).toContain('남은 시간: 지금 마감');
  });

  it('does not ask for submissions when everyone has submitted', () => {
    vi.setSystemTime(new Date('2026-05-08T00:00:00.000Z'));
    const deadline = new Date('2026-05-09T03:00:00.000Z');

    const message = createReminderMessage('똥글똥글 2기 7주차', deadline, []);

    expect(message.content).toContain('전원 제출 완료');
    expect(message.embeds?.[0]?.description).toContain('🎉 전원 제출 완료!');
  });

  it('summarizes cycle status with progress and exact next actions', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      ['박준형', '김항해'],
      ['이항해'],
      new Date('2026-05-10T14:59:59.000Z')
    );

    const embed = message.embeds?.[0];
    expect(embed?.title).toBe('똥글똥글 2기 7주차 제출 현황');
    expect(embed?.description).toContain('진행률: 2 / 3명 제출, 67%');
    expect(embed?.fields?.[0]?.value).toContain('- 박준형');
    expect(embed?.fields?.[1]?.value).toContain('- 이항해');
    expect(embed?.fields?.[2]?.value).toContain('/me info');
  });

  it('makes all-submitted status celebratory instead of showing an empty missing list', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      ['박준형'],
      [],
      new Date('2026-05-10T14:59:59.000Z')
    );

    const embed = message.embeds?.[0];
    expect(embed?.description).toContain('🎉 전원 제출 완료!');
    expect(embed?.fields?.[1]?.value).toContain(
      '이번 주차 모든 참여자가 제출을 완료했어요'
    );
  });

  it('makes zero submissions explicit', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      [],
      ['박준형'],
      new Date('2026-05-10T14:59:59.000Z')
    );

    expect(message.embeds?.[0]?.fields?.[0]?.value).toContain(
      '아직 제출자가 없어요'
    );
  });

  it('handles empty participant lists without dividing by zero', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      [],
      [],
      new Date('2026-05-10T14:59:59.000Z')
    );

    expect(message.embeds?.[0]?.description).toContain(
      '진행률: 0 / 0명 제출, 0%'
    );
  });

  it('sends a Discord webhook payload', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true } as Response);

    await sendDiscordWebhook('https://discord.example/webhook', {
      content: 'hello',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.example/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hello' }),
      })
    );
  });

  it('surfaces Discord webhook failures with the response status text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
    } as Response);

    await expect(
      sendDiscordWebhook('https://discord.example/webhook', {
        content: 'hello',
      })
    ).rejects.toThrow('Discord webhook failed: Bad Request');
  });
});
