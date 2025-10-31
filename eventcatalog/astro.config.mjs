
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { searchForWorkspaceRoot } from 'vite';
import { mermaid } from "./src/remark-plugins/mermaid"
import { plantuml } from "./src/remark-plugins/plantuml"
import { join } from 'node:path';
import remarkDirective from 'remark-directive';
import { remarkDirectives } from "./src/remark-plugins/directives"
import node from '@astrojs/node';
import remarkComment from 'remark-comment'
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import rehypeExpressiveCode from 'rehype-expressive-code'

/** @type {import('bin/eventcatalog.config').Config} */
import config from './eventcatalog.config';
import expressiveCode from 'astro-expressive-code';
import ecstudioWatcher from './integrations/ecstudio-watcher.mjs';

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

  experimental: {
    contentIntellisense: true,
  },


  // just turn this off for all users (for now...)
  devToolbar: { enabled: false },
  integrations: [
    react(),
    tailwind(),
    expressiveCode({
      ...expressiveCodeConfig,
    }),
    mdx({
      // https://docs.astro.build/en/guides/integrations-guide/mdx/#optimize
      optimize: config.mdxOptimize || false,
      remarkPlugins: [remarkDirective, remarkDirectives, remarkComment, mermaid, plantuml],
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
  ].filter(Boolean),
  vite: {
    define: {
      /**
       * Trailing slash is exposed as global variable here principally for `@utils/url-builder`.
       * The utility is used by client components and because of that it can't direct import 
       * the eventcatalog.config, as the config use packages that only run in node environments,
       * such as `node:path`.
       */
      '__EC_TRAILING_SLASH__': config.trailingSlash || false,
    },
    server: {
      fs: {
        allow: [
          '..', 
          './node_modules/@fontsource',
          searchForWorkspaceRoot(process.cwd()),
        ]
      },
      ...(config.server?.allowedHosts ? { allowedHosts: config.server?.allowedHosts } : {}),
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
      external: ['eventcatalog.auth.js'],
    }
  }
});
