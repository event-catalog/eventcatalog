/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { AstroIntegration } from 'astro';
import fs from 'node:fs';
import path from 'path';
import config from '../../../eventcatalog.config.js';
import {
  isEventCatalogChatEnabled,
  isAuthEnabled,
  isEventCatalogScaleEnabled,
  isEventCatalogMCPEnabled,
  isEventCatalogMCPAuthEnabled,
  isFullCatalogAPIEnabled,
  isDevMode,
  isIntegrationsEnabled,
  isCustomDocsEnabled,
  isCustomPagesEnabled,
  isSSR,
} from '../../utils/feature';
import {
  CUSTOM_PAGES_MANIFEST_FILENAME,
  getCustomPageRoutes,
  isApiRoute,
  listCustomPageFiles,
  resolveCustomPagesPrefix,
} from '../custom-pages/routes';

const catalogDirectory = process.env.CATALOG_DIR || process.cwd();
const customPagesDirectory = path.join(catalogDirectory, 'src/custom-pages');

// Routes are injected at astro:config:setup, so adding or removing a custom page
// file needs a full Astro restart before its route exists. This manifest is
// registered via addWatchFile — rewriting it with a changed file list triggers
// that restart (a Vite-level server.restart() does NOT re-run route injection).
const customPagesManifest = path.join(customPagesDirectory, CUSTOM_PAGES_MANIFEST_FILENAME);

const writeCustomPagesManifest = () => {
  const content = JSON.stringify(listCustomPageFiles(customPagesDirectory));

  try {
    if (fs.existsSync(customPagesManifest) && fs.readFileSync(customPagesManifest, 'utf-8') === content) {
      return;
    }

    fs.mkdirSync(customPagesDirectory, { recursive: true });
    fs.writeFileSync(customPagesManifest, content);
  } catch (error: any) {
    console.warn(`[EventCatalog] Could not update the custom pages manifest: ${error.message}`);
  }
};

const configureCustomPages = (params: {
  command: 'dev' | 'build' | 'preview' | 'sync';
  injectRoute: (route: { pattern: string; entrypoint: string }) => void;
}) => {
  const prefix = resolveCustomPagesPrefix(config.pages?.prefix);
  const routes = getCustomPageRoutes(customPagesDirectory, prefix);

  const apiRoutes = routes.filter(isApiRoute);
  if (apiRoutes.length > 0 && !isSSR()) {
    const message = `Custom API routes (${apiRoutes.map((route) => `pages/${route.file}`).join(', ')}) require EventCatalog to run in server mode. Set output: 'server' in your eventcatalog.config.js or remove the pages/api directory.`;

    // The dev server serves endpoints dynamically regardless of output mode,
    // so only fail the build — but warn early during development.
    if (params.command === 'build') {
      throw new Error(`[EventCatalog] ${message}`);
    }
    console.warn(`[EventCatalog] ${message}`);
  }

  for (const route of routes) {
    params.injectRoute({
      pattern: route.pattern,
      entrypoint: path.join(customPagesDirectory, route.file),
    });
  }
};

const configureAuthentication = (params: {
  injectRoute: (route: { pattern: string; entrypoint: string }) => void;
  addMiddleware: (middleware: { entrypoint: string; order: 'pre' }) => void;
}) => {
  params.injectRoute({
    pattern: '/api/[...auth]',
    entrypoint: path.join(catalogDirectory, 'src/enterprise/auth/[...auth].ts'),
  });
  params.injectRoute({
    pattern: '/auth/login',
    entrypoint: path.join(catalogDirectory, 'src/enterprise/auth/login.astro'),
  });
  params.injectRoute({
    pattern: '/auth/error',
    entrypoint: path.join(catalogDirectory, 'src/enterprise/auth/error.astro'),
  });

  params.injectRoute({
    pattern: '/unauthorized',
    entrypoint: path.join(catalogDirectory, 'src/enterprise/auth/unauthorized.astro'),
  });

  // Add the authentication middleware
  params.addMiddleware({
    entrypoint: path.join(catalogDirectory, 'src/enterprise/auth/middleware/middleware.ts'),
    order: 'pre',
  });
};

export default function eventCatalogIntegration(): AstroIntegration {
  return {
    name: 'eventcatalog',
    hooks: {
      'astro:config:setup': (params) => {
        // Handle routes for AI features
        if (isEventCatalogChatEnabled()) {
          params.injectRoute({
            pattern: '/api/chat',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/ai/chat-api.ts'),
          });
        }

        // Handle routes for MCP Server (requires SSR + Scale)
        if (isEventCatalogMCPEnabled()) {
          params.injectRoute({
            pattern: '/docs/mcp/[...path]',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/mcp/mcp-server.ts'),
          });
        }

        if (isEventCatalogMCPAuthEnabled()) {
          params.injectRoute({
            pattern: '/.well-known/oauth-protected-resource',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/mcp/oauth-protected-resource.ts'),
          });
          params.injectRoute({
            pattern: '/.well-known/oauth-protected-resource/[...path]',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/mcp/oauth-protected-resource.ts'),
          });
        }

        // Handle routes for authentication
        if (isAuthEnabled()) {
          configureAuthentication(params);
        }

        // Custom documentation routes (Starter/Scale plan)
        if (isCustomDocsEnabled()) {
          params.injectRoute({
            pattern: '/docs/custom',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/custom-documentation/pages/docs/custom/root-index.astro'),
          });
          params.injectRoute({
            pattern: '/docs/custom/[...path]',
            entrypoint: path.join(
              catalogDirectory,
              'src/enterprise/custom-documentation/pages/docs/custom/[...path]/index.astro'
            ),
          });
          params.injectRoute({
            pattern: '/docs/custom/[...path].mdx',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/custom-documentation/pages/docs/custom/[...path].mdx.ts'),
          });
        } else {
          // Show feature page for non-paying users
          params.injectRoute({
            pattern: '/docs/custom',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/custom-documentation/pages/docs/custom/feature.astro'),
          });
        }

        // Schema API routes (Scale plan)
        if (isEventCatalogScaleEnabled()) {
          params.injectRoute({
            pattern: '/api/schemas/[collection]/[id]/[version]',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/api/schemas/[collection]/[id]/[version]/index.ts'),
          });
          params.injectRoute({
            pattern: '/api/schemas/services/[id]/[version]/[specification]',
            entrypoint: path.join(
              catalogDirectory,
              'src/enterprise/api/schemas/services/[id]/[version]/[specification]/index.ts'
            ),
          });
        }

        // Full catalog API route (opt-in)
        if (isFullCatalogAPIEnabled()) {
          params.injectRoute({
            pattern: '/api/catalog',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/api/catalog.ts'),
          });
        }

        // Fields Explorer (requires SSR — pages live outside src/pages to avoid static-mode auto-discovery)
        if (isSSR()) {
          params.injectRoute({
            pattern: '/schemas/fields',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/fields/pages/fields.astro'),
          });
          params.injectRoute({
            pattern: '/api/schemas/fields',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/fields/pages/api/fields.ts'),
          });
        }

        // User-defined pages and API routes (Scale plan)
        if (isCustomPagesEnabled()) {
          configureCustomPages(params);
        } else if (listCustomPageFiles(customPagesDirectory).length > 0) {
          console.warn('[EventCatalog] Custom pages require the Scale plan. The routes for your pages will not be served.');
        }

        // Keep routes in sync during dev — a manifest change restarts the dev
        // server so injectRoute runs again with the new file list
        writeCustomPagesManifest();
        params.addWatchFile(customPagesManifest);

        // Warn if integrations are configured without Scale plan
        if (config.integrations && !isIntegrationsEnabled()) {
          console.warn('[EventCatalog] Integrations require the Scale plan. Analytics integrations will not be loaded.');
        }

        // Dev-only routes for visualizer layout persistence
        if (isDevMode()) {
          params.injectRoute({
            pattern: '/api/dev/visualizer-layout/save',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/visualizer-layout/save.ts'),
          });
          params.injectRoute({
            pattern: '/api/dev/visualizer-layout/reset',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/visualizer-layout/reset.ts'),
          });
        }
      },
      'astro:server:setup': ({ server }) => {
        // When custom page files appear or disappear, refresh the manifest.
        // A content change restarts the dev server (via addWatchFile above),
        // which re-runs route injection. Unchanged content writes nothing,
        // so events from the watcher's initial scan are no-ops.
        const onCustomPageChange = (file: string) => {
          if (!path.resolve(file).startsWith(customPagesDirectory + path.sep)) return;
          if (!/\.(astro|ts|js|mjs)$/i.test(file)) return;
          writeCustomPagesManifest();
        };

        server.watcher.on('add', onCustomPageChange);
        server.watcher.on('unlink', onCustomPageChange);
      },
    },
  };
}
