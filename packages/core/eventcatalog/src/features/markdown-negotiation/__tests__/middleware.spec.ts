import { describe, it, expect, vi, beforeEach } from 'vitest';

const llmsTxtEnabled = vi.hoisted(() => ({ value: true }));
vi.mock('@utils/feature', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/feature')>()),
  isLLMSTxtEnabled: () => llmsTxtEnabled.value,
}));

describe('markdownNegotiationMiddleware', () => {
  beforeEach(() => {
    llmsTxtEnabled.value = true;
  });

  const run = async (path: string, init: { accept?: string; method?: string } = {}) => {
    const { markdownNegotiationMiddleware } = await import('../middleware');
    const request = new Request(`http://localhost${path}`, {
      method: init.method ?? 'GET',
      headers: init.accept ? { accept: init.accept } : {},
    });
    const next = vi.fn(async (rewrite?: string) => new Response(rewrite ? 'markdown' : 'html'));
    const response = (await markdownNegotiationMiddleware(
      { request, url: new URL(request.url) } as any,
      next as any
    )) as Response;
    return { response, next };
  };

  it('rewrites a page to its Markdown when the request asks for it', async () => {
    const { response, next } = await run('/docs/events/OrderCreated/1.0.0', { accept: 'text/markdown' });
    expect(next).toHaveBeenCalledWith('/docs/events/OrderCreated/1.0.0.mdx');
    expect(await response.text()).toBe('markdown');
    expect(response.headers.get('Vary')).toBe('Accept');
  });

  it('serves HTML to browsers, and still varies on Accept', async () => {
    const { response, next } = await run('/docs/events/OrderCreated/1.0.0', { accept: 'text/html,*/*;q=0.8' });
    expect(next).toHaveBeenCalledWith();
    expect(await response.text()).toBe('html');
    expect(response.headers.get('Vary')).toBe('Accept');
  });

  it('does not add Accept to Vary twice', async () => {
    const { markdownNegotiationMiddleware } = await import('../middleware');
    const request = new Request('http://localhost/docs/teams/full-stack');
    const response = (await markdownNegotiationMiddleware(
      { request, url: new URL(request.url) } as any,
      (async () => new Response('html', { headers: { Vary: 'Origin, accept' } })) as any
    )) as Response;
    expect(response.headers.get('Vary')).toBe('Origin, accept');
  });

  it('leaves pages without Markdown alone', async () => {
    const { response, next } = await run('/discover/events', { accept: 'text/markdown' });
    expect(next).toHaveBeenCalledWith();
    expect(response.headers.get('Vary')).toBeNull();
  });

  it('only negotiates GET and HEAD', async () => {
    const { next } = await run('/docs/events/OrderCreated/1.0.0', { accept: 'text/markdown', method: 'POST' });
    expect(next).toHaveBeenCalledWith();
  });

  it('does nothing when llms.txt is turned off', async () => {
    llmsTxtEnabled.value = false;
    const { response, next } = await run('/docs/events/OrderCreated/1.0.0', { accept: 'text/markdown' });
    expect(next).toHaveBeenCalledWith();
    expect(response.headers.get('Vary')).toBeNull();
  });

  it('copies responses whose headers cannot be changed', async () => {
    const { markdownNegotiationMiddleware } = await import('../middleware');
    const request = new Request('http://localhost/docs/teams/full-stack', { headers: { accept: 'text/markdown' } });
    const locked = Response.redirect('http://localhost/elsewhere', 302);
    const response = (await markdownNegotiationMiddleware(
      { request, url: new URL(request.url) } as any,
      (async () => locked) as any
    )) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get('Vary')).toBe('Accept');
  });
});
