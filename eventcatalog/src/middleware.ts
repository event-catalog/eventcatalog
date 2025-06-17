import type { MiddlewareHandler } from 'astro';
import { authMiddleware } from './middleware-auth.ts';
import { sequence } from 'astro:middleware';
import { join } from 'node:path';
import { isSSR } from '@utils/feature';

// Try to load customer's custom RBAC middleware
let customerRbacMiddleware: MiddlewareHandler | null = null;

try {
  const catalogDirectory = process.env.PROJECT_DIR || process.cwd();
  const customerMiddleware = await import(/* @vite-ignore */ join(catalogDirectory, 'middleware.ts'));
  customerRbacMiddleware = customerMiddleware.rbacMiddleware;

  if (!isSSR()) {
    // Tell user they need to build in SSR mode
    console.log(
      '🔴 Found custom middleware.ts file. To use RBAC, you need to build in SSR mode, by setting output: "server" in your eventcatalog.config.js file.'
    );
  } else {
    console.log('✅ Loaded custom RBAC middleware');
  }
} catch (error) {
  // Just silently fail, we don't want to block the app
}

const errorHandlingMiddleware: MiddlewareHandler = async (context, next) => {
  const response = await next();

  if (response.status === 403) {
    const params = new URLSearchParams({
      path: context.url.pathname,
      returnTo: context.url.pathname + context.url.search,
    });

    return context.redirect(`/unauthorized?${params.toString()}`);
  }

  return response;
};

const middlewareChain = customerRbacMiddleware
  ? [errorHandlingMiddleware, authMiddleware, customerRbacMiddleware]
  : [errorHandlingMiddleware, authMiddleware];

export const onRequest = isSSR() ? sequence(...middlewareChain) : undefined;
