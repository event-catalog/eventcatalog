/**
 * Adapted from auth-astro 4.2.0 (MIT, https://github.com/nowaythatworked/auth-astro).
 * See ./config.ts for why this lives in Core.
 */
import { Auth } from '@auth/core';
import type { AuthAction, Session } from '@auth/core/types';
import type { APIContext } from 'astro';
import { parseString } from 'set-cookie-parser';
import authConfig from 'auth:config';

const actions: AuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error'];

function AstroAuthHandler(prefix: string, options = authConfig) {
  return async ({ cookies, request }: APIContext) => {
    const url = new URL(request.url);
    const action = url.pathname.slice(prefix.length + 1).split('/')[0] as AuthAction;

    if (!actions.includes(action) || !url.pathname.startsWith(prefix + '/')) return;

    const res = await Auth(request, options);
    if (['callback', 'signin', 'signout'].includes(action)) {
      // Multiple Set-Cookie headers can't be concatenated, so hand each one to Astro
      const setCookies = res.headers.getSetCookie();
      if (setCookies.length > 0) {
        setCookies.forEach((cookie) => {
          const { name, value, ...cookieOptions } = parseString(cookie);
          cookies.set(name, value, cookieOptions as Parameters<(typeof cookies)['set']>[2]);
        });
        res.headers.delete('Set-Cookie');
      }
    }
    return res;
  };
}

/**
 * Creates the Astro GET and POST endpoints for authentication.
 */
export function AstroAuth(options = authConfig) {
  const { AUTH_SECRET, AUTH_TRUST_HOST, VERCEL, NODE_ENV } = import.meta.env;

  options.secret ??= AUTH_SECRET;
  options.trustHost ??= !!(AUTH_TRUST_HOST ?? VERCEL ?? NODE_ENV !== 'production');

  const { prefix = '/api/auth', ...authOptions } = options;

  const handler = AstroAuthHandler(prefix, authOptions);
  return {
    async GET(context: APIContext) {
      return await handler(context);
    },
    async POST(context: APIContext) {
      return await handler(context);
    },
  };
}

/**
 * Fetches the current session, or `null` if there is none.
 */
export async function getSession(req: Request, options = authConfig): Promise<Session | null> {
  options.secret ??= import.meta.env.AUTH_SECRET;
  options.trustHost ??= true;

  const url = new URL(`${options.prefix}/session`, req.url);
  const response = await Auth(new Request(url, { headers: req.headers }), options);
  const { status = 200 } = response;

  const data = await response.json();

  if (!data || !Object.keys(data).length) return null;
  if (status === 200) return data;
  throw new Error(data.message);
}
