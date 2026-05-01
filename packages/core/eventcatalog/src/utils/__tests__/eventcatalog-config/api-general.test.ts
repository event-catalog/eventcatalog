import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the writer module so tests don't touch the real filesystem.
vi.mock('@utils/eventcatalog-config/config-writer', () => {
  return {
    readConfigSource: vi.fn(),
    applyConfigUpdate: vi.fn(),
    writeConfigUpdate: vi.fn(),
  };
});

import { POST } from '../../../pages/api/settings/general';
import { readConfigSource, applyConfigUpdate, writeConfigUpdate } from '@utils/eventcatalog-config/config-writer';

const ORIGINAL_DEV_MODE = process.env.EVENTCATALOG_DEV_MODE;

const buildRequest = (body: unknown): Request =>
  new Request('http://localhost/api/settings/general', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const callPost = async (req: Request): Promise<Response> => {
  // Astro's APIRoute signature passes a context object; the handler only reads `request`.
  return (await (POST as any)({ request: req })) as Response;
};

describe('POST /api/settings/general', () => {
  beforeEach(() => {
    vi.mocked(readConfigSource).mockReturnValue("export default { title: 'old' };");
    vi.mocked(applyConfigUpdate).mockReturnValue("export default { title: 'new' };");
    vi.mocked(writeConfigUpdate).mockReturnValue("export default { title: 'new' };");
  });

  afterEach(() => {
    if (ORIGINAL_DEV_MODE === undefined) delete process.env.EVENTCATALOG_DEV_MODE;
    else process.env.EVENTCATALOG_DEV_MODE = ORIGINAL_DEV_MODE;
    vi.clearAllMocks();
  });

  it('writes the config and returns 200 in dev mode', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    const res = await callPost(buildRequest({ title: 'New Title', theme: 'default' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.settings.title).toBe('New Title');
    expect(writeConfigUpdate).toHaveBeenCalledOnce();
  });

  it('returns 403 when not in dev mode and does not write', async () => {
    delete process.env.EVENTCATALOG_DEV_MODE;
    const res = await callPost(buildRequest({ title: 'New Title', theme: 'default' }));
    expect(res.status).toBe(403);
    expect(writeConfigUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body and does not write', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    const res = await callPost(buildRequest('not-json'));
    expect(res.status).toBe(400);
    expect(writeConfigUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when title is missing and does not write', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    const res = await callPost(buildRequest({ theme: 'default' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(writeConfigUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when homepageLink is not a valid URL', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    const res = await callPost(buildRequest({ title: 'X', theme: 'default', homepageLink: 'not-a-url' }));
    expect(res.status).toBe(400);
    expect(writeConfigUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 with sensible error when the config file cannot be read', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    vi.mocked(readConfigSource).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const res = await callPost(buildRequest({ title: 'X', theme: 'default' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('eventcatalog.config.js');
    expect(writeConfigUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when the config file is malformed and does not write', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    vi.mocked(applyConfigUpdate).mockImplementation(() => {
      throw new Error('parse error');
    });
    const res = await callPost(buildRequest({ title: 'X', theme: 'default' }));
    expect(res.status).toBe(500);
    expect(writeConfigUpdate).not.toHaveBeenCalled();
  });

  it('passes nested logo update through to the writer', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    const res = await callPost(
      buildRequest({
        title: 'X',
        theme: 'default',
        logo: { alt: 'A', text: 'T' },
      })
    );
    expect(res.status).toBe(200);
    expect(writeConfigUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'X',
        theme: 'default',
        logo: { alt: 'A', text: 'T' },
      })
    );
  });

  it('omits empty optional fields by sending null to the writer', async () => {
    process.env.EVENTCATALOG_DEV_MODE = 'true';
    await callPost(buildRequest({ title: 'X', theme: 'default', tagline: '', organizationName: '   ' }));
    const arg = vi.mocked(writeConfigUpdate).mock.calls[0][0];
    expect(arg.tagline).toBeNull();
    expect(arg.organizationName).toBeNull();
  });
});
