import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { mermaid } from './src/remark-plugins/mermaid';
import { plantuml } from './src/remark-plugins/plantuml';
import { join } from 'node:path';
import remarkDirective from 'remark-directive';
import { remarkDirectives } from './src/remark-plugins/directives';
import { remarkResourceRef } from './src/remark-plugins/resource-ref';
import { remarkCodeGroup } from './src/remark-plugins/code-group';
import node from '@astrojs/node';
import remarkComment from 'remark-comment';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { eventCatalogLikeC4 } from './src/plugins/likec4';
import { loadAstroCompressIntegration } from './src/plugins/astro-compress';
import { astroTrailingSlashEndpointFix } from './src/plugins/astro-trailing-slash-endpoint-fix';
import { linkValidation } from './src/plugins/link-validation';

import rehypeExpressiveCode from 'rehype-expressive-code';

import expressiveCode from 'astro-expressive-code';
// Expressive Code options (including the non-serializable `themeCssSelector`
// function) live in the package's ec.config.mjs. Both the integration's
// preprocessors and the rehype plugin below load those same package defaults.
import expressiveCodeConfig from './ec.config.mjs';
import ecstudioWatcher from './integrations/ecstudio-watcher.mjs';
import eventCatalogIntegration from './src/enterprise/integrations/eventcatalog-features.ts';
import eventCatalogRuntime, { getDevServerFileSystem, packageDirectory } from './integrations/eventcatalog-runtime.mjs';
import config from './src/utils/eventcatalog-config/source.ts';
import preprocessExpressiveCodeConfig from './integrations/expressive-code-config.mjs';
import catalogAssets from './integrations/catalog-assets.mjs';
import runtimeDependencies from './integrations/runtime-dependencies.mjs';
import { getRuntimePaths } from './integrations/runtime-paths.mjs';

const projectDirectory = process.env.PROJECT_DIR || process.cwd();
const { runtimeDirectory } = getRuntimePaths(projectDirectory, process.env.CATALOG_DIR);
const base = config.base || '/';
const host = config.host || false;
const compress = config.compress ?? false;
const isDevMode = process.env.EVENTCATALOG_DEV_MODE === 'true';
const effectiveOutput = isDevMode ? 'server' : config.output || 'static';
const searchType = config.search?.type || 'resource';
const bundledRuntimeDependencies = [
  '@xyflow/react',
  '@eventcatalog/core',
  '@astrojs/react',
  '@astrojs/node',
  '@astrojs/internal-helpers',
];
const externalRuntimeDependencies = ['astro/assets/services/sharp'];

const markdownRemarkPlugins = [remarkDirective, remarkDirectives, remarkComment, mermaid, plantuml];
const mdxRemarkPlugins = [...markdownRemarkPlugins, remarkResourceRef, remarkCodeGroup];
const mdxRehypePlugins = [
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
];

// https://astro.build/config
export default defineConfig({
  root: projectDirectory,
  srcDir: runtimeDirectory,
  publicDir: join(projectDirectory, 'public'),
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
    processor: unified({
      remarkPlugins: markdownRemarkPlugins,
      rehypePlugins: mdxRehypePlugins,
    }),
  },

  // just turn this off for all users (for now...)
  devToolbar: { enabled: false },

  // Unused resource types are valid. Astro otherwise warns on every getCollection()
  // call for those empty collections ("check your content config file for errors").
  logger: {
    entrypoint: new URL('./src/plugins/quiet-empty-collections-logger.mjs', import.meta.url),
  },
  integrations: [
    eventCatalogRuntime({ projectDirectory, runtimeDirectory }),
    react(),
    expressiveCode({
      customConfigPreprocessors: {
        preprocessAstroIntegrationConfig: preprocessExpressiveCodeConfig,
        preprocessComponentConfig: `export { default } from ${JSON.stringify(join(packageDirectory, 'integrations/expressive-code-config.mjs'))};`,
      },
    }),
    mdx({
      // https://docs.astro.build/en/guides/integrations-guide/mdx/#optimize
      optimize: config.mdxOptimize || false,
      processor: unified({
        remarkPlugins: mdxRemarkPlugins,
        rehypePlugins: mdxRehypePlugins,
      }),
    }),
    catalogAssets({ projectDirectory, generatedDirectory: join(runtimeDirectory, 'public') }),
    effectiveOutput !== 'server' && compress && (await loadAstroCompressIntegration(projectDirectory)),
    ecstudioWatcher(),
    eventCatalogIntegration(),
    linkValidation(config.linkValidation),
  ].filter(Boolean),
  vite: {
    // Resolve Core's private dependencies from the installed package (including
    // strict pnpm layouts), while Astro owns the user's project and content.
    root: packageDirectory,
    // User components must share the renderer's React, even if the catalog has
    // installed its own version. Preserve the former copied-component contract.
    resolve: { dedupe: ['react', 'react-dom'] },
    envDir: projectDirectory,
    cacheDir: join(runtimeDirectory, 'vite'),
    environments: {
      prerender: {
        resolve: {
          noExternal: bundledRuntimeDependencies,
          external: externalRuntimeDependencies,
        },
      },
    },
    plugins: [
      runtimeDependencies(),
      tailwindcss(),
      ...(await eventCatalogLikeC4(projectDirectory)),
      ...(config.trailingSlash === true ? [astroTrailingSlashEndpointFix()] : []),
    ],
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
      fs: getDevServerFileSystem({ projectDirectory }),
      ...(config.server?.allowedHosts ? { allowedHosts: config.server?.allowedHosts } : {}),
      // Pre-transform critical modules during startup so they're ready when
      // the first page request arrives. Without this, Vite transforms each
      // module on-demand during the first request, adding seconds to TTFB.
      warmup: {
        ssrFiles: [
          join(packageDirectory, 'src/pages/index.astro'),
          join(packageDirectory, 'src/pages/_index.astro'),
          join(packageDirectory, 'src/layouts/VerticalSideBarLayout.astro'),
          join(packageDirectory, 'src/components/Header.astro'),
          join(packageDirectory, 'src/components/SideNav/SideNav.astro'),
        ],
        clientFiles: [
          join(packageDirectory, 'src/components/SideNav/NestedSideBar/index.tsx'),
          join(packageDirectory, 'src/components/Search/SearchModal.tsx'),
        ],
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
      noExternal: bundledRuntimeDependencies,
      external: ['eventcatalog.auth.js', 'eventcatalog.chat.js', ...externalRuntimeDependencies],
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
        'diff',
        'diff2html',
        // Used by the ArchitectureGraph embeds — discovering these lazily mid-session
        // triggers a re-optimize that 504s every already-loaded chunk
        'd3-force',
        'd3-selection',
        'd3-zoom',
        'd3-drag',
      ],
    },
  },
});
