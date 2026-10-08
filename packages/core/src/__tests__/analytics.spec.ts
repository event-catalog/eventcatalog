import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { raiseEvent } from '../analytics/analytics.js';

const catalogId = '8027010c-f3d6-417a-8234-e2f46087fc56';

const hangUntilAbort = (_url: string, init?: RequestInit) =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return;
    const abort = () => reject(signal.reason ?? new Error('aborted'));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
  });

describe('raiseEvent', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('EVENTCATALOG_TELEMETRY_DISABLED', '');
    vi.stubEnv('DO_NOT_TRACK', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('sends the run when it has a command and catalog id', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await raiseEvent({ command: 'build', cId: catalogId, org: 'Acme Inc' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(2000);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toMatchObject({ command: 'build', cId: catalogId, org: 'Acme Inc' });
  });

  it.each([
    ['EVENTCATALOG_TELEMETRY_DISABLED', '1'],
    ['EVENTCATALOG_TELEMETRY_DISABLED', 'true'],
    ['EVENTCATALOG_TELEMETRY_DISABLED', 'TRUE'],
    ['DO_NOT_TRACK', '1'],
    ['DO_NOT_TRACK', 'true'],
    ['DO_NOT_TRACK', 'True'],
  ])('sends nothing when %s is %s', async (name, value) => {
    vi.stubEnv(name, value);

    await raiseEvent({ command: 'build', cId: catalogId, org: 'Acme Inc' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing when telemetry is false in config', async () => {
    await raiseEvent({ command: 'build', cId: catalogId, org: 'Acme Inc' }, { telemetry: false });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['0', '', 'false', 'no'])('still sends when EVENTCATALOG_TELEMETRY_DISABLED is %j', async (value) => {
    vi.stubEnv('EVENTCATALOG_TELEMETRY_DISABLED', value);

    await raiseEvent({ command: 'build', cId: catalogId, org: 'Acme Inc' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['0', '', 'false'])('still sends when DO_NOT_TRACK is %j', async (value) => {
    vi.stubEnv('DO_NOT_TRACK', value);

    await raiseEvent({ command: 'build', cId: catalogId, org: 'Acme Inc' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still sends when config telemetry is true', async () => {
    await raiseEvent({ command: 'build', cId: catalogId }, { telemetry: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns after the timeout when the request hangs, and swallows the abort', async () => {
    fetchMock.mockImplementation(hangUntilAbort);

    const started = Date.now();
    await expect(raiseEvent({ command: 'build', cId: catalogId })).resolves.toBeUndefined();

    expect(Date.now() - started).toBeLessThan(4500);
  }, 10000);

  it('swallows a failed response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    await expect(raiseEvent({ command: 'build', cId: catalogId })).resolves.toBeUndefined();
  });

  it('swallows a network error', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(raiseEvent({ command: 'build', cId: catalogId })).resolves.toBeUndefined();
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
