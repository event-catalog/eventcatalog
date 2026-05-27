import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { searchForWorkspaceRoot } from 'vite';
import { mermaid } from './src/remark-plugins/mermaid';
import { plantuml } from './src/remark-plugins/plantuml';
import { join } from 'node:path';
import remarkDirective from 'remark-directive';
import { remarkDirectives } from './src/remark-plugins/directives';
import { remarkResourceRef } from './src/remark-plugins/resource-ref';
import node from '@astrojs/node';
import remarkComment from 'remark-comment';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import rehypeExpressiveCode from 'rehype-expressive-code';

/** @type {import('bin/eventcatalog.config').Config} */
import config from './eventcatalog.config';
import expressiveCode from 'astro-expressive-code';
import ecstudioWatcher from './integrations/ecstudio-watcher.mjs';
import eventCatalogIntegration from './src/enterprise/integrations/eventcatalog-features.ts';

const projectDirectory = process.env.PROJECT_DIR || process.cwd();
const base = config.base || '/';
const host = config.host || false;
const compress = config.compress ?? false;
const isDevMode = process.env.EVENTCATALOG_DEV_MODE === 'true';
const effectiveOutput = isDevMode ? 'server' : config.output || 'static';
const searchType = config.search?.type || 'resource';

const expressiveCodeConfig = {
  themes: ['github-light', 'github-dark'],
  defaultProps: {
    wrap: true,
  },
};

const markdownRemarkPlugins = [remarkDirective, remarkDirectives, remarkComment, mermaid, plantuml];
const mdxRemarkPlugins = [...markdownRemarkPlugins, remarkResourceRef];

// https://astro.build/config
export default defineConfig({
  base,
  server: { 
    port: config.port || 3000,
    host: host,
    // Add allowed hosts if its set
    ...(config.server?.allowedHosts ? { allowedHosts: config.server?.allowedHosts } : {}),
  },

  // If security is set
  ...(config.security ? { security: config.security } : {}),

  // In dev mode (EVENTCATALOG_DEV_MODE=true) we need 'server' output so that
  // routes which opt into SSR via `export const prerender = false` (e.g. the
  // /api/settings/* editing endpoints) are actually invoked instead of being
  // statically prerendered. Production builds keep the user's configured output.
  output: effectiveOutput,

  adapter: effectiveOutput === 'server' ? node({ mode: 'standalone' }) : undefined,

  outDir: config.outDir ? join(projectDirectory, config.outDir) : join(projectDirectory, 'dist'),

  // https://docs.astro.build/en/reference/configuration-reference/#site
  site: config.homepageLink || 'https://eventcatalog.dev/',

  // https://docs.astro.build/en/reference/configuration-reference/#trailingslash
  trailingSlash: config.trailingSlash === true ? 'always' : 'ignore',

  markdown: {
    remarkPlugins: markdownRemarkPlugins,
    gfm: true,
  },

  // just turn this off for all users (for now...)
  devToolbar: { enabled: false },
  integrations: [
    react(),
    expressiveCode({
      ...expressiveCodeConfig,
    }),
    mdx({
      // https://docs.astro.build/en/guides/integrations-guide/mdx/#optimize
      optimize: config.mdxOptimize || false,
      remarkPlugins: mdxRemarkPlugins,
      rehypePlugins: [
        [
          rehypeExpressiveCode,
          {
            ...expressiveCodeConfig,
          },
        ],
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: { className: ['anchor-link'] },
          },
        ],
      ],
      gfm: true,
    }),
    effectiveOutput !== 'server' &&
      compress &&
      (await import('astro-compress')).default({
        Logger: 0,
        CSS: false,
      }),
    ecstudioWatcher(),
    eventCatalogIntegration(),
  ].filter(Boolean),
  vite: {
    plugins: [tailwindcss()],
    define: {
      /**
       * Trailing slash is exposed as global variable here principally for `@utils/url-builder`.
       * The utility is used by client components and because of that it can't direct import
       * the eventcatalog.config, as the config use packages that only run in node environments,
       * such as `node:path`.
       */
      __EC_TRAILING_SLASH__: JSON.stringify(config.trailingSlash === true),
      __EC_BASE__: JSON.stringify(base),
      __EC_SEARCH_TYPE__: JSON.stringify(searchType),
    },
    server: {
      fs: {
        allow: ['..', './node_modules/@fontsource', searchForWorkspaceRoot(process.cwd())],
      },
      // Prevent stale FSEvents from triggering a config-dependency restart on first run.
      // During startup, catalogToAstro copies eventcatalog.config.js into .eventcatalog-core
      // shortly before Astro/Vite begins watching. On macOS, FSEvents can deliver buffered
      // notifications for those recent writes, causing Vite to restart mid-dep-scan.
      // awaitWriteFinish makes chokidar verify the file is stable before emitting events,
      // filtering out those stale notifications.
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      },
      ...(config.server?.allowedHosts ? { allowedHosts: config.server?.allowedHosts } : {}),
      // Pre-transform critical modules during startup so they're ready when
      // the first page request arrives. Without this, Vite transforms each
      // module on-demand during the first request, adding seconds to TTFB.
      warmup: {
        ssrFiles: [
          './src/pages/index.astro',
          './src/pages/_index.astro',
          './src/layouts/VerticalSideBarLayout.astro',
          './src/components/Header.astro',
          './src/components/SideNav/SideNav.astro',
        ],
        clientFiles: ['./src/components/SideNav/NestedSideBar/index.tsx', './src/components/Search/SearchModal.tsx'],
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    ssr: {
      noExternal: ['@xyflow/react'],
      external: ['eventcatalog.auth.js', 'eventcatalog.chat.js'],
    },
    optimizeDeps: {
      exclude: [],
      // Pre-bundle heavy dependencies so Vite doesn't discover and transform
      // them lazily on first request. This significantly reduces initial page
      // load time in dev mode.
      include: [
        'lucide-react',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
        '@heroicons/react/20/solid',
        '@headlessui/react',
        '@nanostores/react',
        'nanostores',
        'react',
        'react-dom',
        'semver',
      ],
      esbuildOptions: {
        jsx: 'automatic',
      },
    },
  },
});
