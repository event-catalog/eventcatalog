export default {
  cId: '8e76292c-353d-4c0e-a6ee-7a73096d4a12',
  title: 'SSR Auth Test Catalog',
  tagline: 'A minimal catalog used to verify that a server catalog loads its auth files.',
  organizationName: 'SSR Auth Test Catalog',
  homepageLink: 'https://eventcatalog.dev',
  editUrl: 'https://github.com/event-catalog/eventcatalog',
  base: '/',
  trailingSlash: false,
  output: 'server',
  outDir: 'dist',
  auth: {
    enabled: true,
  },
  // A generator in the catalog, imported by its path (CI runs `eventcatalog generate` on Windows)
  generators: [['<rootDir>/generator.mjs', {}]],
  search: {
    type: 'resource',
  },
  llmsTxt: {
    enabled: false,
  },
};
