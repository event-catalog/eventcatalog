import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { raiseEvent } from '../analytics/analytics.js';

describe('raiseEvent', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('sends the run when it has a command and catalog id', async () => {
    await raiseEvent({ command: 'build', cId: '8027010c-f3d6-417a-8234-e2f46087fc56', org: 'Acme Inc' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toMatchObject({ command: 'build', cId: '8027010c-f3d6-417a-8234-e2f46087fc56', org: 'Acme Inc' });
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'abcd'],
    ['an object without a command or catalog id', { path: '/tmp', token: 'x', url: 'https://example.com' }],
    ['a command without a catalog id', { command: 'build' }],
    ['a catalog id without a command', { cId: '8027010c-f3d6-417a-8234-e2f46087fc56' }],
  ])('sends nothing when called with %s, as package scanners do after a release', async (_, eventData) => {
    await raiseEvent(eventData);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
