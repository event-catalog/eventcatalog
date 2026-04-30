/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { AstroIntegration } from 'astro';
import path from 'path';
import config from '../../../eventcatalog.config.js';
import {
  isEventCatalogChatEnabled,
  isAuthEnabled,
  isEventCatalogScaleEnabled,
  isEventCatalogStarterEnabled,
  isEventCatalogMCPEnabled,
  isFullCatalogAPIEnabled,
  isDevMode,
  isIntegrationsEnabled,
  isExportPDFEnabled,
  isCustomDocsEnabled,
  isSSR,
} from '../../utils/feature';

const catalogDirectory = process.env.CATALOG_DIR || process.cwd();

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

        // Export to PDF print pages (Scale plan)
        if (isExportPDFEnabled()) {
          params.injectRoute({
            pattern: '/docs/print/[type]/[id]/[version]',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/print/message.astro'),
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
    },
  };
}
