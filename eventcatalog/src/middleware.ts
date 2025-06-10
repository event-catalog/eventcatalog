// src/middleware.ts
import type { MiddlewareHandler } from 'astro';
import { getSession } from 'auth-astro/server';
import { isAuthEnabled } from '@utils/feature';

export const onRequest: MiddlewareHandler = async (context, next) => {
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

  // Skip auth check for these routes
  const publicRoutes = ['/auth/login', '/auth/signout', '/auth/error', '/api/auth'];

  // Skip static files, system routes, and browser requests
  if (
    pathname.startsWith('/_') ||
    systemRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith('/.well-known/')
  ) {
    return next();
  }

  // Skip public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return next();
  }

  try {
    // Check if user is logged in
    const session = await getSession(request);

    if (!session) {
      const callbackUrl = encodeURIComponent(pathname + url.search);
      return redirect(`/auth/login?callbackUrl=${callbackUrl}`);
    }

    // Add session to locals for pages to use
    // @ts-ignore
    locals.session = session;
    // @ts-ignore
    locals.user = session.user;
  } catch (error) {
    console.error('Session error:', error);
    const callbackUrl = encodeURIComponent(pathname + url.search);
    return redirect(`/auth/login?callbackUrl=${callbackUrl}`);
  }

  return next();
};
