import { describe, expect, it } from 'vitest';

import { createApiEnvelope, normalizeError } from './api-envelope';

describe('API envelope', () => {
  it('wraps successful REST payloads with success, data, error, and meta', () => {
    const envelope = createApiEnvelope({ studies: [] }, 200, 'req_test');

    expect(envelope).toEqual({
      success: true,
      data: { studies: [] },
      error: null,
      meta: {
        requestId: 'req_test',
        timestamp: expect.any(String),
      },
    });
  });

  it('wraps error payloads with a structured error and null data', () => {
    const envelope = createApiEnvelope(
      { error: 'Study not found' },
      404,
      'req_missing'
    );

    expect(envelope).toEqual({
      success: false,
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Study not found',
      },
      meta: {
        requestId: 'req_missing',
        timestamp: expect.any(String),
      },
    });
  });

  it('keeps already enveloped payloads stable', () => {
    const existing = createApiEnvelope({ ok: true }, 200, 'req_original');

    expect(createApiEnvelope(existing, 200, 'req_new')).toBe(existing);
  });

  it('normalizes message-only failures to status-derived error codes', () => {
    expect(normalizeError({ message: 'Invalid payload' }, 400)).toEqual({
      code: 'BAD_REQUEST',
      message: 'Invalid payload',
    });
  });
});
