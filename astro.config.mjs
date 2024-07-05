import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
// import { rehypeHeadingIds } from '@astrojs/markdown-remark';
// import rehypeMinifyHtml from 'rehype-minify-html';
import rehypeSlug from 'rehype-slug';
import remarkGFM from 'remark-gfm';
import pagefind from "astro-pagefind";
import { mermaid } from "./src/remark-plugins/mermaid"

import expressiveCode from 'astro-expressive-code';
import config from './eventcatalog.config';

// https://astro.build/config
export default defineConfig({
  base: '/',
  server: { port: 3000 },

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
      // themes: ['github-light'],
      themes: ['github-light'],
    }),
    
    mdx({
      remarkPlugins: [
        // Add ids to headings
        // rehypeSlug,
        // remarkGFM
      ],
      // rehypePlugins: [rehypeMinifyHtml],
      // syntaxHighlight: 'shiki',
      // shikiConfig: {
      //   theme: 'github-light',
      //   langs: ['yaml']
      // },

      remarkPlugins: [mermaid],
      // remarkRehype: {
      //   footnoteLabel: 'Footnotes',
      // },
      gfm: false,
    }),
    pagefind(),
  ],
});
