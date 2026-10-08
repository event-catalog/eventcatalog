import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configUtils = vi.hoisted(() => ({
  getEventCatalogConfigFile: vi.fn(),
  verifyRequiredFieldsAreInCatalogConfigFile: vi.fn(),
}));

const resources = vi.hoisted(() => ({
  countResources: vi.fn(),
  hashCatalogContent: vi.fn(),
  serializeCounts: vi.fn((counts: Record<string, number>) =>
    Object.entries(counts)
      .map(([key, value]) => `${key}:${value}`)
      .join(',')
  ),
}));

vi.mock('../eventcatalog-config-file-utils.js', () => configUtils);
vi.mock('../analytics/count-resources.js', () => resources);

import logBuild from '../analytics/log-build.js';

const catalogId = '8027010c-f3d6-417a-8234-e2f46087fc56';
const simpleAnalyticsUrl = 'https://queue.simpleanalyticscdn.com/events';
const cloudAnalyticsUrl = 'https://api.ecingest.dev/v1/analytics/ingest';

const baseConfig = {
  cId: catalogId,
  organizationName: 'Acme Inc',
  tsd: 1,
  generators: [],
};

const cloudAnalytics = {
  enabled: true,
  trackingId: 'track-1',
  writeKey: 'key-1',
};

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

describe('logBuild', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('EVENTCATALOG_TELEMETRY_DISABLED', '');
    vi.stubEnv('DO_NOT_TRACK', '');
    configUtils.verifyRequiredFieldsAreInCatalogConfigFile.mockResolvedValue(undefined);
    configUtils.getEventCatalogConfigFile.mockResolvedValue({ ...baseConfig });
    resources.countResources.mockResolvedValue({ events: 2 });
    resources.hashCatalogContent.mockResolvedValue('abc123');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    configUtils.getEventCatalogConfigFile.mockReset();
    configUtils.verifyRequiredFieldsAreInCatalogConfigFile.mockReset();
    resources.countResources.mockReset();
    resources.hashCatalogContent.mockReset();
  });

  it('collects and sends telemetry by default', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    await logBuild('/tmp/catalog', { command: 'dev', license: { state: 'none' } });

    expect(resources.countResources).toHaveBeenCalledWith('/tmp/catalog');
    expect(resources.hashCatalogContent).toHaveBeenCalledWith('/tmp/catalog');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(simpleAnalyticsUrl);
    expect(timeout).toHaveBeenCalledWith(2000);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toMatchObject({
      command: 'dev',
      org: 'Acme Inc',
      cId: catalogId,
      contentHash: 'abc123',
      resources: 'events:2',
    });
  });

  it.each([
    ['EVENTCATALOG_TELEMETRY_DISABLED', '1'],
    ['EVENTCATALOG_TELEMETRY_DISABLED', 'true'],
    ['EVENTCATALOG_TELEMETRY_DISABLED', 'TRUE'],
    ['DO_NOT_TRACK', '1'],
    ['DO_NOT_TRACK', 'true'],
    ['DO_NOT_TRACK', 'True'],
  ])('does not collect or send telemetry when %s is %s', async (name, value) => {
    vi.stubEnv(name, value);

    await logBuild('/tmp/catalog', { command: 'build', license: { state: 'none' } });

    expect(resources.countResources).not.toHaveBeenCalled();
    expect(resources.hashCatalogContent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not collect or send telemetry when telemetry is false in config', async () => {
    configUtils.getEventCatalogConfigFile.mockResolvedValue({ ...baseConfig, telemetry: false });

    await logBuild('/tmp/catalog');

    expect(resources.countResources).not.toHaveBeenCalled();
    expect(resources.hashCatalogContent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['0', '', 'false', 'no'])('still collects telemetry when EVENTCATALOG_TELEMETRY_DISABLED is %j', async (value) => {
    vi.stubEnv('EVENTCATALOG_TELEMETRY_DISABLED', value);

    await logBuild('/tmp/catalog', { license: { state: 'none' } });

    expect(resources.countResources).toHaveBeenCalledTimes(1);
    expect(resources.hashCatalogContent).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(simpleAnalyticsUrl);
  });

  it.each(['0', '', 'false'])('still collects telemetry when DO_NOT_TRACK is %j', async (value) => {
    vi.stubEnv('DO_NOT_TRACK', value);

    await logBuild('/tmp/catalog', { license: { state: 'none' } });

    expect(resources.hashCatalogContent).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(simpleAnalyticsUrl);
  });

  it('reports cloud inventory when telemetry is off, without hashing the catalog', async () => {
    vi.stubEnv('DO_NOT_TRACK', '1');
    configUtils.getEventCatalogConfigFile.mockResolvedValue({
      ...baseConfig,
      telemetry: false,
      cloud: { analytics: cloudAnalytics },
    });
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    await logBuild('/tmp/catalog');

    expect(resources.hashCatalogContent).not.toHaveBeenCalled();
    expect(resources.countResources).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(cloudAnalyticsUrl);
    expect(timeout).toHaveBeenCalledWith(2000);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      trackingId: 'track-1',
      event: 'catalog.resource_inventory_reported',
      counts: expect.objectContaining({ events: 2 }),
    });
  });

  it('does not count resources when telemetry is off and cloud analytics is not fully configured', async () => {
    configUtils.getEventCatalogConfigFile.mockResolvedValue({
      ...baseConfig,
      telemetry: false,
      cloud: { analytics: { enabled: true, trackingId: 'track-1' } },
    });

    await logBuild('/tmp/catalog');

    expect(resources.countResources).not.toHaveBeenCalled();
    expect(resources.hashCatalogContent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still sends telemetry when the cloud inventory request fails', async () => {
    configUtils.getEventCatalogConfigFile.mockResolvedValue({
      ...baseConfig,
      cloud: { analytics: { ...cloudAnalytics, endpoint: 'https://cloud.example/ingest' } },
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url === 'https://cloud.example/ingest') throw new Error('cloud down');
      return { ok: true };
    });

    await logBuild('/tmp/catalog', { license: { state: 'none' } });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['https://cloud.example/ingest', simpleAnalyticsUrl]);
  });

  it('does not block on a hanging cloud inventory request', async () => {
    vi.stubEnv('EVENTCATALOG_TELEMETRY_DISABLED', '1');
    configUtils.getEventCatalogConfigFile.mockResolvedValue({
      ...baseConfig,
      cloud: { analytics: cloudAnalytics },
    });
    fetchMock.mockImplementation(hangUntilAbort);

    const started = Date.now();
    await expect(logBuild('/tmp/catalog')).resolves.toBeUndefined();

    expect(Date.now() - started).toBeLessThan(4500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resources.hashCatalogContent).not.toHaveBeenCalled();
  }, 10000);

  it('swallows failures while reading the catalog config', async () => {
    configUtils.getEventCatalogConfigFile.mockRejectedValue(new Error('config exploded'));

    await expect(logBuild('/tmp/catalog')).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resources.hashCatalogContent).not.toHaveBeenCalled();
  });
});
