// src/middleware/auth.ts
import type { MiddlewareHandler } from 'astro';
import { getSession } from 'auth-astro/server';
import { isAuthEnabled } from '@utils/feature';
import jwt from 'jsonwebtoken';
import { isLLMSTxtEnabled } from '@utils/feature';

const isLLMSTextEnabled = isLLMSTxtEnabled();

// Define the types in this file
export interface NormalizedUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  roles: string[];
  permissions: string[];
  groups: string[];
  metadata: Record<string, any>;
  provider: 'auth0' | 'okta' | 'microsoft' | 'google' | 'unknown';
  raw: {
    user: any;
    token: any;
  };
}

// Type the locals object with matching utilities
interface TypedLocals {
  session: any;
  user: NormalizedUser;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasGroup: (group: string) => boolean;
  findMatchingRule: (rules: Record<string, () => boolean>, pathname: string) => (() => boolean) | null;
  matchesPattern: (pattern: string, pathname: string) => boolean;
}

// Wildcard matching utilities
export function matchesPattern(pattern: string, path: string): boolean {
  const escapeRegExp = (str: string) => str.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');

  // Convert the pattern to a regular expression
  const regexStr = pattern
    .split('/')
    .map((part) => {
      if (part === '**') return '.*';
      if (part === '*') return '[^/]+';
      return escapeRegExp(part);
    })
    .join('/');

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(path);
}

function calculateSpecificity(pattern: string): number {
  let score = 0;
  score += (pattern.length - (pattern.match(/\*/g) || []).length) * 10;
  score -= (pattern.match(/\*/g) || []).length * 5;
  return score;
}

export function findMatchingRule(rules: Record<string, () => boolean>, pathname: string) {
  const matches = [];

  for (const [pattern, rule] of Object.entries(rules)) {
    if (matchesPattern(pattern, pathname)) {
      matches.push({ pattern, rule, specificity: calculateSpecificity(pattern) });
    }
  }

  // Sort by specificity (most specific first)
  matches.sort((a, b) => b.specificity - a.specificity);

  return matches.length > 0 ? matches[0].rule : null;
}

export const authMiddleware: MiddlewareHandler = async (context, next) => {
  const { request, redirect, locals } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // If auth is disabled and we are on an auth route, redirect to home
  if (!isAuthEnabled() && pathname.includes('/auth')) {
    return redirect('/');
  }

  // Auth is disabled, skip auth check
  if (!isAuthEnabled()) {
    return next();
  }

  // Skip system/browser requests
  const systemRoutes = ['/.well-known/', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/_astro/', '/__astro'];
  let publicRoutes = ['/auth/login', '/auth/signout', '/auth/error', '/api/auth'];

  const llmsRoutes = ['/docs/llm/llms.txt', '/docs/llm/llms-services.txt', '/docs/llm/llms-full.txt'];

  if (isLLMSTextEnabled) {
    publicRoutes = [...publicRoutes, ...llmsRoutes];
  }

  if (
    pathname.startsWith('/_') ||
    systemRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith('/.well-known/') ||
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    (pathname.endsWith('.mdx') && isLLMSTextEnabled) ||
    (pathname.endsWith('.md') && isLLMSTextEnabled)
  ) {
    return next();
  }

  try {
    const session = await getSession(request);

    if (!session) {
      const callbackUrl = encodeURIComponent(pathname + url.search);
      return redirect(`/auth/login?callbackUrl=${callbackUrl}`);
    }

    // Normalize user data across providers
    const normalizedUser = normalizeUserData(session);

    // Type assertion for locals
    const typedLocals = locals as TypedLocals;

    // Add session and normalized user to locals
    typedLocals.session = session;
    typedLocals.user = normalizedUser;

    // Add helper functions for customer middleware
    typedLocals.hasRole = (role: string) => normalizedUser.roles.includes(role);
    typedLocals.hasPermission = (permission: string) => normalizedUser.permissions.includes(permission);
    typedLocals.hasGroup = (group: string) => {
      return normalizedUser.groups.includes(group);
    };

    // Add wildcard matching utilities to locals
    typedLocals.findMatchingRule = findMatchingRule;
    typedLocals.matchesPattern = matchesPattern;
  } catch (error) {
    console.error('Session error:', error);
    const callbackUrl = encodeURIComponent(pathname + url.search);
    return redirect(`/auth/login?callbackUrl=${callbackUrl}`);
  }

  return next();
};

// Normalize user data from different providers
function normalizeUserData(session: any): NormalizedUser {
  const user = session.user;
  const accessToken = session.accessToken;
  let decodedToken = null;

  if (accessToken) {
    try {
      decodedToken = jwt.decode(accessToken);
    } catch (e) {
      console.warn('Could not decode access token');
    }
  }

  const provider = detectProvider(session);

  switch (provider) {
    case 'auth0':
      return normalizeAuth0User(user, decodedToken);
    case 'okta':
      return normalizeOktaUser(user, decodedToken);
    case 'microsoft':
      return normalizeMicrosoftUser(user, decodedToken);
    case 'google':
      return normalizeGoogleUser(user, decodedToken);
    default:
      return normalizeGenericUser(user, decodedToken);
  }
}

function detectProvider(session: any): string {
  const account = session.account;
  if (account?.provider) return account.provider;

  if (session.user?.sub?.startsWith('auth0|')) return 'auth0';
  if (session.user?.iss?.includes('okta.com') || session.user?.provider?.includes('okta')) return 'okta';
  if (session.user?.iss?.includes('microsoft')) return 'microsoft';
  if (session.user?.iss?.includes('google')) return 'google';

  return 'unknown';
}

function normalizeAuth0User(user: any, token: any): NormalizedUser {
  return {
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    roles: token?.['https://eventcatalog.dev/roles'] || [],
    permissions: token?.permissions || [],
    groups: token?.['https://eventcatalog.dev/groups'] || [],
    metadata: token?.['https://eventcatalog.dev/app_metadata'] || {},
    provider: 'auth0',
    raw: { user, token },
  };
}

function normalizeOktaUser(user: any, token: any): NormalizedUser {
  // Try to get groups from multiple sources
  let groups: string[] = [];
  let roles: string[] = [];

  // Source 1: User object (from session)
  if (user.groups && Array.isArray(user.groups)) {
    groups = user.groups;
  }

  // Source 2: Decoded token (from access token)
  if ((!groups || groups.length === 0) && token?.groups && Array.isArray(token.groups)) {
    groups = token.groups;
  }

  // Source 3: Roles
  if (user.roles && Array.isArray(user.roles)) {
    roles = user.roles;
  } else if (token?.roles && Array.isArray(token.roles)) {
    roles = token.roles;
  }

  return {
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    roles: roles,
    permissions: [],
    groups: groups,
    metadata: {
      department: token?.department || user.department,
      title: token?.title || user.title,
      locale: token?.locale || user.locale,
    },
    provider: 'okta',
    raw: { user, token },
  };
}

function normalizeMicrosoftUser(user: any, token: any): NormalizedUser {
  // Groups should now be available directly on the user object from the session callback
  const groups = user.groups || token?.groups || [];
  const roles = user.roles || token?.roles || [];

  return {
    id: user.sub || user.oid,
    email: user.email || user.preferred_username,
    name: user.name,
    picture: user.picture,
    roles: roles,
    permissions: [],
    groups: groups,
    metadata: {
      department: token?.extension_Department,
      jobTitle: token?.jobTitle,
      companyName: token?.companyName,
    },
    provider: 'microsoft',
    raw: { user, token },
  };
}

function normalizeGoogleUser(user: any, token: any): NormalizedUser {
  return {
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    roles: [],
    permissions: [],
    groups: [],
    metadata: {
      domain: token?.hd,
      locale: token?.locale,
    },
    provider: 'google',
    raw: { user, token },
  };
}

function normalizeGenericUser(user: any, token: any): NormalizedUser {
  return {
    id: user.sub || user.id || user.email,
    email: user.email,
    name: user.name,
    picture: user.picture,
    roles: user.roles || token?.roles || [],
    permissions: user.permissions || token?.permissions || [],
    groups: user.groups || token?.groups || [],
    metadata: {},
    provider: 'unknown',
    raw: { user, token },
  };
}
