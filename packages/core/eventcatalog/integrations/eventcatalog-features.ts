import type { AstroIntegration } from 'astro';
import path from 'path';
import config from '../eventcatalog.config.js';
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
} from '../src/utils/feature';

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

        // If non paying user, add the plans route into the project
        if (!isEventCatalogStarterEnabled() && !isEventCatalogScaleEnabled()) {
          params.injectRoute({
            pattern: '/plans',
            entrypoint: path.join(catalogDirectory, 'src/enterprise/plans/index.astro'),
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
