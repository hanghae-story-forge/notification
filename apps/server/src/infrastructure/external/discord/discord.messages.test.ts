import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createReminderMessage,
  createStatusMessage,
  createSubmissionMessage,
  sendDiscordWebhook,
} from './discord.messages';

describe('Discord message UX', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates an action-oriented submission completion message', () => {
    const message = createSubmissionMessage(
      '박준형',
      'https://blog.example.com/post',
      '똥글똥글 2기 7주차'
    );

    expect(message.content).toContain('박준형님 제출 완료');
    expect(message.embeds?.[0]?.title).toBe('똥글똥글 2기 7주차 제출 완료');
    expect(message.embeds?.[0]?.description).toContain('정상 기록됐어요');
    expect(message.embeds?.[0]?.description).toContain('[글 보러가기](https://blog.example.com/post)');
    expect(message.embeds?.[0]?.description).toContain('/cycle status');
  });

  it('creates an action-oriented reminder for deadlines more than a day away', () => {
    const deadline = new Date('2026-05-10T03:00:00.000Z');

    const message = createReminderMessage('똥글똥글 2기 7주차', deadline, [
      '김항해',
      '박준형',
    ]);

    expect(message.content).toContain('마감이 얼마 남지 않았어요');
    expect(message.embeds?.[0]?.description).toContain('남은 시간: 1일 3시간');
    expect(message.embeds?.[0]?.description).toContain('아직 제출 전: 2명');
    expect(message.embeds?.[0]?.description).toContain('- 김항해');
    expect(message.embeds?.[0]?.description).toContain('GitHub 이슈 댓글에 링크를 남깁니다');
    expect(message.embeds?.[0]?.description).toContain('/me info');
  });

  it('formats reminders below one day in hours', () => {
    const deadline = new Date('2026-05-09T05:00:00.000Z');

    const message = createReminderMessage('똥글똥글 2기 7주차', deadline, ['박준형']);

    expect(message.embeds?.[0]?.description).toContain('남은 시간: 5시간');
  });

  it('creates a progress-focused status message for partial submissions', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      ['김항해', '박준형'],
      ['이프론트'],
      new Date('2026-05-10T14:59:59.000Z')
    );

    const embed = message.embeds?.[0];
    expect(embed?.description).toContain('진행률: 2 / 3명 제출, 67%');
    expect(embed?.description).toContain('남은 인원: 1명');
    expect(embed?.fields?.[0]?.name).toBe('✅ 제출 2명');
    expect(embed?.fields?.[0]?.value).toContain('- 김항해');
    expect(embed?.fields?.[1]?.name).toBe('⏳ 아직 미제출 1명');
    expect(embed?.fields?.[1]?.value).toContain('- 이프론트');
  });

  it('celebrates when everyone submitted', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      ['김항해', '박준형'],
      [],
      new Date('2026-05-10T14:59:59.000Z')
    );

    const embed = message.embeds?.[0];
    expect(embed?.description).toContain('🎉 전원 제출 완료!');
    expect(embed?.fields?.[1]?.value).toContain('이번 주차 모든 참여자가 제출을 완료했어요');
  });

  it('makes zero submissions explicit', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      [],
      ['김항해', '박준형'],
      new Date('2026-05-10T14:59:59.000Z')
    );

    const embed = message.embeds?.[0];
    expect(embed?.description).toContain('진행률: 0 / 2명 제출, 0%');
    expect(embed?.fields?.[0]?.value).toContain('아직 제출자가 없어요');
  });

  it('handles status with no participants defensively', () => {
    const message = createStatusMessage(
      '똥글똥글 2기 7주차',
      [],
      [],
      new Date('2026-05-10T14:59:59.000Z')
    );

    expect(message.embeds?.[0]?.description).toContain('진행률: 0 / 0명 제출, 0%');
  });

  it('sends a Discord webhook payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await sendDiscordWebhook('https://discord.example/webhook', {
      content: 'hello',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://discord.example/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
    });
  });

  it('throws when Discord webhook sending fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, statusText: 'Bad Request' })
    );

    await expect(
      sendDiscordWebhook('https://discord.example/webhook', { content: 'hello' })
    ).rejects.toThrow('Discord webhook failed: Bad Request');
  });
});
