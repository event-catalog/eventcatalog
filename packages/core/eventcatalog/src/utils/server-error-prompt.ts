import { version as eventCatalogCoreVersion } from '../../../package.json';

export const EVENTCATALOG_CORE_VERSION = eventCatalogCoreVersion;

export const PAGE_URL_PLACEHOLDER = '__EVENTCATALOG_PAGE_URL__';
export const USER_AGENT_PLACEHOLDER = '__EVENTCATALOG_USER_AGENT__';

export const BUG_REPORT_ISSUE_URL = 'https://github.com/event-catalog/eventcatalog/issues/new?template=bug.yml';
export const EVENTCATALOG_REPO_URL = 'https://github.com/event-catalog/eventcatalog';

const MAX_STACK_CHARS = 8000;

export type CatalogOutput = 'static' | 'server';

export interface AgentBugPromptInput {
  errorMessage: string;
  errorStack?: string;
  pageUrl?: string;
  userAgent?: string;
  eventCatalogVersion?: string;
  configuredOutput?: CatalogOutput | 'unknown';
  effectiveOutput?: CatalogOutput | 'unknown';
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

export function getBugFormOutputLabel(
  configuredOutput: CatalogOutput | 'unknown' = 'unknown'
): 'Static' | 'Server (Server Side Rendering)' | 'Unknown' {
  if (configuredOutput === 'server') {
    return 'Server (Server Side Rendering)';
  }

  if (configuredOutput === 'static') {
    return 'Static';
  }

  return 'Unknown';
}

export function resolveCatalogOutput(value: unknown, fallback: CatalogOutput | 'unknown' = 'unknown'): CatalogOutput | 'unknown' {
  return value === 'server' || value === 'static' ? value : fallback;
}

export function buildAgentBugPrompt(input: AgentBugPromptInput): string {
  const errorMessage = input.errorMessage.trim() || 'An unexpected error occurred while rendering this page.';
  const pageUrl = input.pageUrl?.trim() || PAGE_URL_PLACEHOLDER;
  const userAgent = input.userAgent?.trim() || USER_AGENT_PLACEHOLDER;
  const version = input.eventCatalogVersion?.trim() || EVENTCATALOG_CORE_VERSION;
  const configuredOutput = input.configuredOutput ?? 'unknown';
  const effectiveOutput = input.effectiveOutput ?? 'unknown';
  const outputLabel = getBugFormOutputLabel(configuredOutput);
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
- Configured catalog output: ${configuredOutput}
- Effective Astro output: ${effectiveOutput}

If Output is Unknown, choose Static vs Server from the configured catalog output when you can confirm it. \`eventcatalog dev\` always uses on-demand rendering even when the catalog is configured for static output. This 500 page does not run for prerendered static pages, missing catalog pages (404s), or client-side React island crashes.
`;
}
