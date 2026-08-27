import { VERSION } from '../../../src/constants';

export { VERSION };

export const PAGE_URL_PLACEHOLDER = '__EVENTCATALOG_PAGE_URL__';
export const USER_AGENT_PLACEHOLDER = '__EVENTCATALOG_USER_AGENT__';

export const BUG_REPORT_ISSUE_URL = 'https://github.com/event-catalog/eventcatalog/issues/new?template=bug.yml';
export const EVENTCATALOG_REPO_URL = 'https://github.com/event-catalog/eventcatalog';

const MAX_STACK_CHARS = 8000;

export interface AgentBugPromptInput {
  errorMessage: string;
  errorStack?: string;
  pageUrl?: string;
  userAgent?: string;
  eventCatalogVersion?: string;
  isSSR?: boolean;
  isDevMode?: boolean;
  nodeVersion?: string;
  platform?: string;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error == null) {
    return 'An unexpected error occurred while rendering this page.';
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      return serialized;
    }
  } catch {
    // Fall through to String(error).
  }

  const asString = String(error);
  return asString && asString !== '[object Object]' ? asString : 'An unexpected error occurred while rendering this page.';
}

export function getErrorStack(error: unknown): string | undefined {
  if (!(error instanceof Error) || !error.stack) {
    return undefined;
  }

  return error.stack.length > MAX_STACK_CHARS ? `${error.stack.slice(0, MAX_STACK_CHARS)}\n…(truncated)` : error.stack;
}

export function getPlatformLabel(platform: string = process.platform): 'MacOS' | 'Linux' | 'Windows' | 'Other' {
  switch (platform) {
    case 'darwin':
      return 'MacOS';
    case 'linux':
      return 'Linux';
    case 'win32':
      return 'Windows';
    default:
      return 'Other';
  }
}

export function getBugFormOutputLabel(ssr: boolean): 'Static' | 'Server (Server Side Rendering)' {
  return ssr ? 'Server (Server Side Rendering)' : 'Static';
}

/**
 * Path only — no origin (internal hostnames) and no query string (possible tokens).
 */
export function toSafePagePath(input: string): string {
  const value = input.trim();
  if (!value || value === PAGE_URL_PLACEHOLDER) {
    return value;
  }

  try {
    const url = value.includes('://') ? new URL(value) : new URL(value, 'http://localhost');
    return url.pathname || '/';
  } catch {
    const withoutHash = value.split('#')[0] ?? value;
    const pathOnly = withoutHash.split('?')[0] ?? withoutHash;
    return pathOnly || '/';
  }
}

export function buildAgentBugPrompt(input: AgentBugPromptInput): string {
  const errorMessage = input.errorMessage.trim() || 'An unexpected error occurred while rendering this page.';
  const pageUrl = toSafePagePath(input.pageUrl?.trim() || PAGE_URL_PLACEHOLDER);
  const userAgent = input.userAgent?.trim() || USER_AGENT_PLACEHOLDER;
  const version = input.eventCatalogVersion?.trim() || VERSION;
  const ssr = Boolean(input.isSSR);
  const outputLabel = getBugFormOutputLabel(ssr);
  const nodeVersion = input.nodeVersion?.trim() || `v${process.versions.node}`;
  const platformLabel = getPlatformLabel(input.platform);
  const isDevMode = Boolean(input.isDevMode);
  const stack = input.errorStack?.trim();

  const stackBlock = stack
    ? `
Stack (captured in development only; do not add guessed production stacks):
\`\`\`
${stack}
\`\`\`
`
    : '';

  return `File a bug on EventCatalog (${EVENTCATALOG_REPO_URL}).

Use the Bug Report issue form:
${BUG_REPORT_ISSUE_URL}

GitHub YAML issue forms cannot be URL-prefilled. Open that form (or create the issue with the GitHub CLI/API) and fill the fields below. Do not invent features. Do not include secrets, credentials, tokens, environment variable values, or catalog content (events, schemas, markdown, or customer data). Only use the diagnostic details in this prompt.

Do not file this as a product bug if the user hit a missing catalog page (404). HybridPage missing resources throw an empty 404 Response, not a 500.

### I tried this:
Opened this EventCatalog page:
${pageUrl}

### This happened:
EventCatalog returned a 500 error while rendering the page on demand (SSR or \`eventcatalog dev\`). The branded 500 page was shown instead of the catalog page.

Error message:
\`\`\`
${errorMessage}
\`\`\`
${stackBlock}
### I expected this:
The page to render successfully.

### EventCatalog Version:
@eventcatalog/core@${version}

### Output:
${outputLabel}

### Node.js Version:
${nodeVersion}

### Platform(s):
${platformLabel}

### Anything else?
- How this prompt was produced: copied from EventCatalog's custom 500 page after an on-demand render failure.
- User agent: ${userAgent}
- EVENTCATALOG_DEV_MODE: ${isDevMode}
- isSSR(): ${ssr} (\`config.output === 'server'\`; \`eventcatalog dev\` still forces on-demand rendering even when this is false)

This 500 page does not run for prerendered static pages, missing catalog pages (404s), Auth.js \`/auth/error\` or \`/unauthorized\` pages, or client-side React island crashes.
`;
}
