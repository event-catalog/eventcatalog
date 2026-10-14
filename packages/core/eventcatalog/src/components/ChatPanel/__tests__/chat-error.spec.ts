import { describe, expect, it } from 'vitest';
import { getChatError } from '../OfflineReply';

describe('getChatError', () => {
  it('is a configuration error when eventcatalog.chat.js did not load, with the reason in dev mode', () => {
    const body = JSON.stringify({
      error: 'The EventCatalog Assistant could not load eventcatalog.chat.js',
      code: 'CHAT_CONFIGURATION_ERROR',
      reason: "Cannot find package '@ai-sdk/anthropic'",
    });
    expect(getChatError(new Error(body))).toEqual({
      type: 'configuration',
      reason: "Cannot find package '@ai-sdk/anthropic'",
    });
  });

  it('is a configuration error without a reason outside dev mode', () => {
    const body = JSON.stringify({ error: 'could not load', code: 'CHAT_CONFIGURATION_ERROR' });
    expect(getChatError(new Error(body))).toEqual({ type: 'configuration', reason: undefined });
  });

  it('shows the error from a JSON response instead of the raw JSON', () => {
    expect(getChatError(new Error(JSON.stringify({ error: 'Rate limit exceeded' })))).toEqual({
      type: 'error',
      message: 'Rate limit exceeded',
    });
  });

  it('shows a plain error message as it is, or a fallback without one', () => {
    expect(getChatError(new Error('Failed to fetch'))).toEqual({ type: 'error', message: 'Failed to fetch' });
    expect(getChatError(undefined)).toEqual({ type: 'error', message: 'Something went wrong. Please try again.' });
  });
});
