/**
 * Adapted from auth-astro 4.2.0 (MIT, https://github.com/nowaythatworked/auth-astro).
 * See ./config.ts for why this lives in Core.
 */

interface AstroSignInOptions extends Record<string, unknown> {
  /** Where to send the user after signing in. Defaults to the current page. */
  callbackUrl?: string;
  /** Redirect after signing in. Defaults to `true`. */
  redirect?: boolean;
  /** Base path for authentication. Defaults to `/api/auth`. */
  prefix?: string;
}

interface AstroSignOutParams {
  /** Where to send the user after signing out. Defaults to the current page. */
  callbackUrl?: string;
  /** Base path for authentication. Defaults to `/api/auth`. */
  prefix?: string;
}

/**
 * Starts a sign-in flow for a provider. Adds the CSRF token to the request.
 */
export async function signIn(providerId?: string, options?: AstroSignInOptions, authorizationParams?: Record<string, string>) {
  const { callbackUrl = window.location.href, redirect = true } = options ?? {};
  const { prefix = '/api/auth', ...opts } = options ?? {};

  const isCredentials = providerId === 'credentials';
  const isEmail = providerId === 'email';
  const isSupportingReturn = isCredentials || isEmail;

  const signInUrl = `${prefix}/${isCredentials ? 'callback' : 'signin'}/${providerId}`;
  const _signInUrl = `${signInUrl}?${new URLSearchParams(authorizationParams)}`;

  const csrfTokenResponse = await fetch(`${prefix}/csrf`);
  const { csrfToken } = await csrfTokenResponse.json();

  const res = await fetch(_signInUrl, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      ...(opts as Record<string, string>),
      csrfToken,
      callbackUrl,
    }),
  });

  const data = await res.clone().json();
  const error = new URL(data.url).searchParams.get('error');

  if (redirect || !isSupportingReturn || !error) {
    window.location.href = data.url ?? callbackUrl;
    // The browser does not reload when only the hash changes
    if (data.url.includes('#')) window.location.reload();
    return;
  }

  return res;
}

/**
 * Signs the user out by removing the session cookie. Adds the CSRF token to the request.
 */
export async function signOut(options?: AstroSignOutParams) {
  const { callbackUrl = window.location.href, prefix = '/api/auth' } = options ?? {};
  const csrfTokenResponse = await fetch(`${prefix}/csrf`);
  const { csrfToken } = await csrfTokenResponse.json();
  const res = await fetch(`${prefix}/signout`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl,
    }),
  });
  const data = await res.json();

  const url = data.url ?? callbackUrl;
  window.location.href = url;
  // The browser does not reload when only the hash changes
  if (url.includes('#')) window.location.reload();
}
