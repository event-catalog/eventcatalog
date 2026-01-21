# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EventCatalog is an open-source documentation tool for Event-Driven Architectures. It helps teams document events, commands, queries, services, domains, and flows in a discoverable catalog. Built with Astro, React, and TypeScript.

## Quick Reference Commands

| Task | Command |
|------|---------|
| Start dev server | `pnpm run start:catalog` |
| Start SSR server | `pnpm run start:catalog:server` |
| Build | `pnpm run verify-build:catalog` |
| Test (all) | `pnpm run test` |
| Test (single file) | `pnpm run test path/to/file.test.ts` |
| Test (watch mode) | `pnpm run test --watch` |
| Format code | `pnpm run format` |
| E2E tests | `pnpm run test:e2e` |

## Project Structure

```
/eventcatalog           # Main application source
  /src
    /components         # React and Astro components
    /pages              # Astro pages and API routes
    /enterprise         # Scale plan features (AI Chat, MCP Server)
    /utils              # Shared utilities
      /collections      # Astro content collection helpers
    /layouts            # Page layouts
    /styles             # CSS and theme files
    /types              # TypeScript type definitions
    /stores             # Nanostores state management
    /content            # Content collection definitions
    /__tests__          # Unit tests (colocated with source)
/examples
  /default              # Default example catalog (used by start:catalog)
  /e-commerce           # E-commerce example
/scripts                # Build and development scripts
```

## Tech Stack

- **Framework**: Astro 5 with React islands
- **Styling**: Tailwind CSS with CSS variables for theming
- **State**: Nanostores
- **Testing**: Vitest (unit), Playwright (E2E)
- **Content**: Astro Content Collections with Zod schemas
- **AI Features**: Vercel AI SDK, MCP Protocol

## Code Conventions

### Imports

```typescript
// Use node: prefix for Node.js built-ins
import fs from 'node:fs';
import path from 'node:path';

// Use path aliases
import { getCollection } from 'astro:content';
import { myUtil } from '@utils/my-util';
import { MyComponent } from '@components/MyComponent';
```

### TypeScript

- Strict typing enabled
- Use `as const` for literal types
- Prefer type guards over type assertions
- Use Zod for runtime validation (especially in API routes)

### Astro Content Collections

Resources are stored in content collections. Key collections:
- `events`, `commands`, `queries` (messages)
- `services`, `domains`, `flows`, `channels`, `entities`
- `teams`, `users` (non-versioned)

The whole astro collection schemas are in the `eventcatalog/src/content.config.ts` file.


### Getting collection information

We prefer to use the utility classes we have to get collection for example:

```
import { getEvents } from '@utils/collections/events';
import { getCommands } from '@utils/collections/commands';
import { getQueries } from '@utils/collections/queries';
import { getServices } from '@utils/collections/services';
import { getDomains } from '@utils/collections/domains';
import { getFlows } from '@utils/collections/flows';
import { getChannels } from '@utils/collections/channels';
import { getEntities } from '@utils/collections/entities';
import { getTeams } from '@utils/collections/teams';
import { getUsers } from '@utils/collections/users';
```

Where you cant do that though you may use the `getCollection` and `getEntry` functions from the `astro:content` package.

```typescript
// Getting collections
import { getCollection, getEntry } from 'astro:content';

const events = await getCollection('events');
const event = await getEntry('events', 'OrderCreated-1.0.0');
```

### Versioning

Most resources are versioned. Entry IDs follow the pattern: `{id}-{version}` (e.g., `OrderCreated-1.0.0`).

When you need to get specific version or latest version you need to use the `getItemsFromCollectionByIdAndSemverOrLatest` utility function.

```typescript
// Use existing utilities for version handling
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
```

### Error Handling

For API routes and tools, return error objects instead of throwing:

```typescript
if (!resource) {
  return { error: `Resource not found: ${id}` };
}
```

### Pagination

Use cursor-based pagination with the `paginate()` helper from `@enterprise/tools/catalog-tools`:

```typescript
import { paginate } from '@enterprise/tools/catalog-tools';

const result = paginate(items, cursor, pageSize);
if ('error' in result) return result;
```

## Feature Flags

Check feature availability before using enterprise features:

```typescript
import { isEventCatalogScaleEnabled, isSSR } from '@utils/feature';

if (!isEventCatalogScaleEnabled()) {
  return { error: 'Feature requires Scale plan' };
}
```

## Testing

- Tests are colocated in `__tests__` directories
- Test files use `.test.ts` or `.test.tsx` extension
- Example catalogs for testing: `src/__tests__/example-catalog/`

Dont run tests in watch mode.

```bash
# Run specific test file
pnpm run test eventcatalog/src/utils/__tests__/my-util.test.ts

# Run tests matching pattern
pnpm run test -t "getResources"
```

## Theming Guidelines

EventCatalog uses CSS variables for theming to support light/dark mode and custom themes.

### Use CSS Variables Instead of Hardcoded Colors

```astro
<!-- Correct - uses CSS variables -->
<div class="bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text))]">

<!-- Incorrect - hardcoded colors -->
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
```

### Common CSS Variables

| Variable | Usage |
|----------|-------|
| `--ec-page-bg` | Page/content background |
| `--ec-page-text` | Primary text color |
| `--ec-page-text-muted` | Secondary/muted text |
| `--ec-page-border` | Borders and dividers |
| `--ec-card-bg` | Card/elevated surface background |
| `--ec-accent` | Accent/brand color |
| `--ec-accent-subtle` | Light accent background |
| `--ec-accent-text` | Text on accent backgrounds |
| `--ec-button-bg` | Button background |
| `--ec-button-text` | Button text |
| `--ec-icon-color` | Icon default color |
| `--ec-icon-hover` | Icon hover color |
| `--ec-input-bg` | Input field background |
| `--ec-input-border` | Input field border |
| `--ec-input-text` | Input field text |

### Theme Files

- Base theme: `eventcatalog/src/styles/theme.css`
- Additional themes: `eventcatalog/src/styles/themes/*.css`

### Key Points

1. Variables use RGB values without `rgb()` wrapper for Tailwind opacity support
2. Use syntax `[rgb(var(--ec-variable))]` in Tailwind classes
3. For opacity: `[rgb(var(--ec-variable)/0.5)]`
4. Dark mode handled via `data-theme="dark"` attribute
5. Never use `dark:` Tailwind variants for theme colors

## Common Patterns

### API Routes with Hono

For complex API routes, use Hono inside Astro API routes:

```typescript
import type { APIRoute } from 'astro';
import { Hono } from 'hono';

const app = new Hono().basePath('/api/my-route');

app.get('/', async (c) => {
  return c.json({ message: 'Hello' });
});

export const ALL: APIRoute = async ({ request }) => {
  return app.fetch(request);
};

export const prerender = false;
```

### Shared Tool Implementations

When building features used by both AI Chat and MCP Server, add shared logic to `@enterprise/tools/catalog-tools.ts`.

## Development Tips

- The example catalog at `/examples/default` is used when running `pnpm run start:catalog`
- SSR mode is required for AI Chat and MCP Server features
- Use `DISABLE_EVENTCATALOG_CACHE=true` env var to disable caching during development
- Run `pnpm run format` before committing changes
- Never verify the build, the developer will do this themselves.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.