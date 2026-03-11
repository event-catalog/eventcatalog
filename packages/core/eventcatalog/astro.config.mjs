
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { searchForWorkspaceRoot } from 'vite';
import { mermaid } from "./src/remark-plugins/mermaid"
import { plantuml } from "./src/remark-plugins/plantuml"
import { join } from 'node:path';
import remarkDirective from 'remark-directive';
import { remarkDirectives } from "./src/remark-plugins/directives"
import { remarkResourceRef } from "./src/remark-plugins/resource-ref"
import node from '@astrojs/node';
import remarkComment from 'remark-comment'
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import rehypeExpressiveCode from 'rehype-expressive-code'

/** @type {import('bin/eventcatalog.config').Config} */
import config from './eventcatalog.config';
import expressiveCode from 'astro-expressive-code';
import ecstudioWatcher from './integrations/ecstudio-watcher.mjs';
import eventCatalogIntegration from './integrations/eventcatalog-features.ts';

const projectDirectory = process.env.PROJECT_DIR || process.cwd();
const base = config.base || '/';
const host = config.host || false;
const compress = config.compress ?? false;


const expressiveCodeConfig = {
  themes: ['andromeeda'],
  defaultProps: {
    wrap: true,
  },
};

// https://astro.build/config
export default defineConfig({
  base,
  server: { port: config.port || 3000, host: host },

  output: config.output || 'static',

  adapter: config.output === 'server' ? node({
    mode: 'standalone'
  }) : undefined,

  outDir: config.outDir ? join(projectDirectory, config.outDir) : join(projectDirectory, 'dist'),

  // https://docs.astro.build/en/reference/configuration-reference/#site
  site: config.homepageLink || 'https://eventcatalog.dev/',

  // https://docs.astro.build/en/reference/configuration-reference/#trailingslash
  trailingSlash: config.trailingSlash === true ? "always" : "ignore",



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
      remarkPlugins: [remarkDirective, remarkDirectives, remarkComment, mermaid, plantuml, remarkResourceRef],
      rehypePlugins: [
        [rehypeExpressiveCode, {
            ...expressiveCodeConfig,
        }],
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
    config.output !== 'server' && compress && (await import("astro-compress")).default({
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
      '__EC_TRAILING_SLASH__': config.trailingSlash || false,
      '__EC_BASE__': JSON.stringify(base),
    },
    server: {
      fs: {
        allow: [
          '..',
          './node_modules/@fontsource',
          searchForWorkspaceRoot(process.cwd()),
        ]
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
        clientFiles: [
          './src/components/SideNav/NestedSideBar/index.tsx',
          './src/components/Search/SearchModal.tsx',
        ],
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    },
    ssr: {
      external: ['eventcatalog.auth.js', 'eventcatalog.chat.js'],
    },
    optimizeDeps: {
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
  }
});
