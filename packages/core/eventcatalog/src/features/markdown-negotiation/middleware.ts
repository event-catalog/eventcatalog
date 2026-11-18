import type { MiddlewareHandler } from 'astro';
import { isLLMSTxtEnabled } from '@utils/feature';
import { getMarkdownPathForPage, getMarkdownRewritePath, prefersMarkdown } from '@utils/markdown-pages';

const withVaryAccept = (response: Response) => {
  const vary = response.headers.get('Vary');
  if (vary?.split(',').some((value) => ['accept', '*'].includes(value.trim().toLowerCase()))) return response;

  try {
    response.headers.append('Vary', 'Accept');
    return response;
  } catch {
    // Some responses (e.g. redirects) have immutable headers
    const headers = new Headers(response.headers);
    headers.append('Vary', 'Accept');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};

/**
 * Server mode only: a documentation page requested with `Accept: text/markdown` gets the page's Markdown (its `.mdx`
 * route) at the same URL, so agents don't need to know about the `.mdx` URLs. Browsers never ask for Markdown, so they
 * keep getting HTML. Runs after auth and RBAC, which have already checked the page's URL.
 */
export const markdownNegotiationMiddleware: MiddlewareHandler = async (context, next) => {
  const method = context.request.method;
  if (!isLLMSTxtEnabled() || (method !== 'GET' && method !== 'HEAD')) return next();

  const base = import.meta.env.BASE_URL;
  const markdownPath = getMarkdownPathForPage(context.url.pathname, base);
  if (!markdownPath) return next();

  const rewritePath = prefersMarkdown(context.request.headers.get('accept')) ? getMarkdownRewritePath(markdownPath, base) : null;

  // The same URL returns HTML or Markdown depending on Accept, so caches must key on it
  return withVaryAccept(rewritePath ? await next(rewritePath) : await next());
};
