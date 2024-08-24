import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import pagefind from "astro-pagefind";
import { mermaid } from "./src/remark-plugins/mermaid"
import { join } from 'node:path';

/** @type {import('bin/eventcatalog.config').Config} */
import config from './eventcatalog.config';
import expressiveCode from 'astro-expressive-code';

const coreDirectory = process.env.CATALOG_DIR || process.cwd();
const base = config.base || '/';

// https://astro.build/config
export default defineConfig({
  base,
  server: { port: config.port || 3000 },

  outDir: join(coreDirectory, 'dist'),

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
      remarkPlugins: [mermaid],
      gfm: false,
    }),
    pagefind(),
  ],
  redirects: {
    "/": {
      status: 302,
      destination: join(base, config.landingPage || '/docs'),
    },
  },
  vite: {
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    },
  }
});
