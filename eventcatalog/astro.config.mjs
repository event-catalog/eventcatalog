import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import pagefind from "astro-pagefind";
import { mermaid } from "./src/remark-plugins/mermaid"
import { join } from 'node:path';
import remarkDirective from 'remark-directive';
import { remarkDirectives } from "./src/remark-plugins/directives"

import remarkComment from 'remark-comment'

/** @type {import('bin/eventcatalog.config').Config} */
import config from './eventcatalog.config';
import expressiveCode from 'astro-expressive-code';

const projectDirectory = process.env.PROJECT_DIR || process.cwd();
const base = config.base || '/';

// https://astro.build/config
export default defineConfig({
  base,
  server: { port: config.port || 3000 },

  outDir: config.outDir ? join(projectDirectory, config.outDir) : join(projectDirectory, 'dist'),

  // https://docs.astro.build/en/reference/configuration-reference/#site
  site: config.homepageLink || 'https://eventcatalog.dev/',

  // https://docs.astro.build/en/reference/configuration-reference/#trailingslash
  trailingSlash: config.trailingSlash === true ? "always" : "ignore",

  // just turn this off for all users (for now...)
  devToolbar: { enabled: false },
  integrations: [
    react(),
    tailwind(),
    expressiveCode({
      themes: ['github-light'],
      defaultProps: {
        // Enable word wrap by default
        wrap: true,
      },
    }),
    
    mdx({
      // https://docs.astro.build/en/guides/integrations-guide/mdx/#optimize
      optimize: config.mdxOptimize || false,
      remarkPlugins: [remarkDirective, remarkDirectives, remarkComment, mermaid],
      gfm: true,
    }),
    pagefind(),
  ],
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
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    },
  }
});
