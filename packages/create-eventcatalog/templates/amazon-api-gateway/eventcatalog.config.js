/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: 'EventCatalog',
  tagline:
    'This internal platform provides a comprehensive view of our event-driven architecture across all systems. Use this portal to discover EventBridge schemas, services and domains, and understand the message contracts that connect our infrastructure',
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
  // Customize the logo, add your logo to public/ folder
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'EventCatalog',
  },
  // Enable RSS feed for your eventcatalog
  rss: {
    enabled: true,
    // number of items to include in the feed per resource (event, service, etc)
    limit: 20,
  },
  docs: {
    sidebar: {
      // TREE_VIEW will render the DOCS as a tree view and map your file system folder structure
      // LIST_VIEW will render the DOCS that look familiar to API documentation websites
      type: 'LIST_VIEW',
    },
  },
  // This lets you copy markdown contents from EventCatalog to your clipboard
  // Including schemas for your events and services
  llmsTxt: {
    enabled: true,
  },
  // required random generated id used by eventcatalog
  cId: '<cId>',
  generators: [
    [
      '@eventcatalog/generator-amazon-apigateway',
      {
        output: 'amazon-api-gateway-output',
        apis: [
          {
            // The name of the API we want to process
            name: 'EcommerceApi',
            // Assume it's deployed to us-east-1, change this if you deployed somewhere else
            region: 'us-east-1',
            // The API stage name
            stageName: 'prod',
            version: '2',
          },
        ],
      },
    ],
    // This will process the output of the amazon api gateway generator
    // it will process the OpenAPI file and map it into a service and domain
    // All routes are mapped to messages.
    [
      '@eventcatalog/generator-openapi',
      {
        services: [
          {
            path: path.join(__dirname, 'amazon-api-gateway-output', 'EcommerceApi.json'),
            id: 'ecommerce-api',
            owners: ['full-stack'],
          },
        ],
      },
    ],
  ],
};
