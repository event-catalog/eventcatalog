import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: 'OurLogix',
  tagline: 'A comprehensive logistics and shipping management company',
  organizationName: 'OurLogix',
  homepageLink: 'https://eventcatalog.dev/',
  landingPage: '',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  // By default set to false, add true to get urls ending in /
  trailingSlash: false,
  // Change to make the base url of the site different, by default https://{website}.com/docs,
  // changing to /company would be https://{website}.com/company/docs,
  base: '/company',
  // Customize the logo, add your logo to public/ folder
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'OurLogix',
  },
  docs: {
    sidebar: {
      // Should the sub heading be rendered in the docs sidebar?
      showPageHeadings: true,
    },
  },
  dependencies: {
    events: [
      { id: 'TestingEventOrder', version: '5.0.0' }
    ],
    services: [
      { id: 'TestingServiceOrder', version: '5.0.0' }
    ],
    channels: [
      { id: 'TestingChannelOrder', version: '5.0.0'},
      { id: '{env}.testing.channel.order', version: '5.0.0'}
    ],
    domains: [
      { id: 'TestingDomainOrder', version: '5.0.0' }
    ],
    commands: [
      { id: 'TestingCommandOrder', version: '5.0.0' }
    ],
    queries: [
      { id: 'TestingQueryOrder', version: '5.0.0' }
    ]
  },
  generators: [
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml') },
          { path: path.join(__dirname, 'asyncapi-files', 'order-fulfillment-service.yml') },
          { path: path.join(__dirname, 'asyncapi-files', 'inventory-service.yml') },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          { path: path.join(__dirname, 'asyncapi-files', 'payment-service.yml') },
          { path: path.join(__dirname, 'asyncapi-files', 'fraud-detection-service.yml') },
        ],
        domain: { id: 'payment', name: 'Payment', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [{ path: path.join(__dirname, 'asyncapi-files', 'user-service.yml') }],
        domain: { id: 'users', name: 'User', version: '0.0.1' },
        debug: true,
      },
    ],
  ],
};
