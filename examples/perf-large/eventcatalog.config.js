/** @type {import('../../packages/core/bin/eventcatalog.config').Config} */
export default {
  cId: 'perf-large-benchmark',
  title: 'Perf Large Catalog',
  tagline: 'Synthetic catalog for EventCatalog build and HTML payload benchmarks.',
  organizationName: 'EventCatalog',
  homepageLink: 'https://eventcatalog.dev',
  port: 3000,
  outDir: 'dist',
  logo: {
    alt: 'EventCatalog',
    text: 'Perf Large',
  },
  base: '/',
  trailingSlash: false,
  rss: {
    enabled: false,
  },
  llmsTxt: {
    enabled: false,
  },
  changelog: {
    enabled: false,
  },
  search: {
    type: 'resource',
  },
  visualiser: {
    enabled: true,
    channels: {
      renderMode: 'flat',
    },
    architectureGraph: {
      enabled: true,
    },
  },
};
