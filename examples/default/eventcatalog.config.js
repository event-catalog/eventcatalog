/** @type {import('../../bin/eventcatalog.config').Config} */
export default {
  cId: '8027010c-f3d6-417a-8234-e2f46087fc56',
  title: 'EventCatalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures',
  organizationName: 'Awesome Fake Company',
  homepageLink: 'https://demo.eventcatalog.dev',
  editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main',
  port: 3000,
  logo: {
    alt: 'EventCatalog',
    src: '/logo.png',
    text: 'EventCatalog',
  },
  base: '/',
  trailingSlash: false,
  docs: {
    sidebar: {
      type: 'TREE_VIEW'
    },
  },
  mermaid: {
    iconPacks: ['logos'],
  },
  rss: {
    enabled: true,
    limit: 15,
  },
  llmsTxt: {
    enabled: true,
  },
  chat: {
    enabled: true,
    similarityResults: 50,
    max_tokens: 4096,
    // 'Llama-3.2-3B-Instruct-q4f16_1-MLC is also good
    model: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC'
  },
  generators: [
    [
      "@eventcatalog/generator-ai", {
        splitMarkdownFiles: false,
      }
    ],
  ],
};
