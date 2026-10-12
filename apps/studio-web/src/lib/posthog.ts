/**
 * EventCatalog's PostHog project (the editor's), for Studio's product analytics: the view's (view/analytics.ts) and
 * the MCP server's (src/analytics.ts). Sent through EventCatalog's relay (not blocked as PostHog's own domain is, and
 * the one origin chat hosts need to let the view connect to). The key is a public project key: it can only send events.
 */
export const POSTHOG_KEY = 'phc_HQZncKORYsXgO87WuSjSdKbQSTzylljE6HTtUw0fBIH';
export const POSTHOG_HOST = 'https://e.eventcatalog.dev/relay-fBIH';
export const POSTHOG_ORIGIN = new URL(POSTHOG_HOST).origin;
