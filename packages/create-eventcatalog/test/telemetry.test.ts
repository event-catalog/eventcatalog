import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { raiseEvent } from '../templates/analytics';
import { isTelemetryDisabled, TELEMETRY_REQUEST_TIMEOUT_MS } from '../templates/telemetry';

describe('isTelemetryDisabled', () => {
  it('leaves telemetry on by default', () => {
    expect(TELEMETRY_REQUEST_TIMEOUT_MS).toBe(2000);
    expect(isTelemetryDisabled({})).toBe(false);
  });

  it.each(['1', 'true', 'TRUE', 'True', '  true  ', '1 '])('opts out when EVENTCATALOG_TELEMETRY_DISABLED is %j', (value) => {
    expect(isTelemetryDisabled({ EVENTCATALOG_TELEMETRY_DISABLED: value })).toBe(true);
  });

  it.each(['1', 'true', 'TRUE', 'True'])('opts out when DO_NOT_TRACK is %j', (value) => {
    expect(isTelemetryDisabled({ DO_NOT_TRACK: value })).toBe(true);
  });

  it.each(['0', '', 'false', 'no', 'off', 'yes', '2'])('stays on when EVENTCATALOG_TELEMETRY_DISABLED is %j', (value) => {
    expect(isTelemetryDisabled({ EVENTCATALOG_TELEMETRY_DISABLED: value })).toBe(false);
  });

  it.each(['0', '', 'false', 'no'])('stays on when DO_NOT_TRACK is %j', (value) => {
    expect(isTelemetryDisabled({ DO_NOT_TRACK: value })).toBe(false);
  });
});

describe('raiseEvent', () => {
  const fetchMock = vi.fn();
  const event = { command: 'create', org: 'Acme Inc', cId: '8027010c-f3d6-417a-8234-e2f46087fc56', tsd: 1 };

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

  it('sends the create event by default, with a 2 second timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    await raiseEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://queue.simpleanalyticscdn.com/events');
    expect(timeout).toHaveBeenCalledWith(2000);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe('@eventcatalog/create-eventcatalog');
    expect(body.metadata).toMatchObject(event);
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

    await raiseEvent(event);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['0', '', 'false'])('still sends when EVENTCATALOG_TELEMETRY_DISABLED is %j', async (value) => {
    vi.stubEnv('EVENTCATALOG_TELEMETRY_DISABLED', value);

    await raiseEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('swallows a network error', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(raiseEvent(event)).resolves.toBeUndefined();
  });
});
