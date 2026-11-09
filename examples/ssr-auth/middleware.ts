// The catalog's own middleware (for access rules). This one marks its responses, so the smoke test can see it loaded.
export const rbacMiddleware = async (_context, next) => {
  const response = await next();
  try {
    response.headers.set('x-eventcatalog-catalog-middleware', 'loaded');
  } catch {
    // A redirect's headers can't be changed
  }
  return response;
};
