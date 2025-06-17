import type { MiddlewareHandler } from 'astro';
interface Locals {
  hasRole: (role: string) => boolean;
  hasGroup: (group: string) => boolean;
  findMatchingRule: (rules: Record<string, () => boolean>, pathname: string) => (() => boolean) | null;
}

export const rbacMiddleware: MiddlewareHandler = async (context, next) => {
  const { locals, url } = context;
  const pathname = url.pathname;

  const { hasRole, hasGroup, findMatchingRule } = locals as Locals;

  const accessRules = {
    '/docs/domains/E-Commerce/*': () => !hasGroup('Viewer'),
    '/visualiser/domains/E-Commerce/*': () => !hasGroup('Viewer'),
  };

  if (findMatchingRule) {
    // Use the utility from locals - no import needed!
    const rule = findMatchingRule(accessRules, pathname);

    if (rule && !rule()) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return next();
};