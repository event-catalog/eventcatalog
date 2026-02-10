import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: 'EventCatalog',
  tagline:
    'This internal platform provides a comprehensive view of our event-driven architecture across all systems. Use this portal to discover existing domains, explore services and their dependencies, and understand the message contracts that connect our infrastructure',
  organizationName: '<organizationName>',
  homepageLink: 'https://eventcatalog.dev/',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  // Supports static or server. Static renders a static site, server renders a server side rendered site
  // large catalogs may benefit from server side rendering
  output: 'static',
  // By default set to false, add true to get urls ending in /
  trailingSlash: false,
  // Change to make the base url of the site different, by default https://{website}.com/docs,
  // changing to /company would be https://{website}.com/company/docs,
  base: '/',
  // Customize the navigation for your docs sidebar.
  // read more at https://eventcatalog.dev/docs/development/customization/customize-sidebars/documentation-sidebar
  navigation: {
    pages: ['list:all'],
  },
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'EventCatalog',
  },
  // This lets you copy markdown contents from EventCatalog to your clipboard
  // Including schemas for your events and services
  llmsTxt: {
    enabled: true,
  },
  generators: [
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          {
            path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'),
            owners: ['order-management'],
            id: 'Orders Service',
          },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          {
            path: path.join(__dirname, 'asyncapi-files', 'payment-service.yml'),
            owners: ['order-management'],
            id: 'Payment Service',
          },
        ],
        domain: { id: 'payment', name: 'Payment', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          { path: path.join(__dirname, 'asyncapi-files', 'user-service.yml'), owners: ['user-management'], id: 'User Service' },
        ],
        domain: { id: 'user-domain', name: 'User Domain', version: '0.0.1' },
        debug: true,
      },
    ],
  ],
  // Enable RSS feed for your eventcatalog
  rss: {
    enabled: true,
    // number of items to include in the feed per resource (event, service, etc)
    limit: 20,
  },
  // required random generated id used by eventcatalog
  cId: '<cId>',
};
