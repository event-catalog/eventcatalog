/** @type {import('../../bin/eventcatalog.config').Config} */
export default {
  cId: '8027010c-f3d6-417a-8234-e2f46087fc56',
  title: 'FlowMart',
  tagline: 'Welcome to FlowMart EventCatalog. Here you can find all the information you need to know about our events and services (demo catalog).',
  organizationName: 'FlowMart',
  homepageLink: 'https://eventcatalog.dev',
  editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main',
  port: 3000,
  logo: {
    alt: 'FlowMart',
    src: '/logo.svg',
    text: 'FlowMart',
  },
  base: '/',
  trailingSlash: false,
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
        debug:true,
        splitMarkdownFiles: false,
      }
    ],
  ],
};
