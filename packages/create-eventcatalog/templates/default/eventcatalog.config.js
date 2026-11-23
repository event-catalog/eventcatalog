/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: '<organizationName>',
  tagline:
    'This internal platform provides a comprehensive view of our event-driven architecture across all systems. Use this portal to discover existing domains, explore services and their dependencies, and understand the message contracts that connect our infrastructure',
  organizationName: '<organizationName>',
  theme: 'sunset',
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
  // Resource search is the default lightweight search. Change this to { type: 'indexed' }
  // to enable full-content search. Indexed search requires running a build to generate the index.
  search: {
    type: 'resource',
  },
  // Customize the navigation for your docs sidebar.
  // read more at https://eventcatalog.dev/docs/development/customization/customize-sidebars/documentation-sidebar
  navigation: {
    pages: ['list:top-level-domains', 'list:top-level-diagrams', 'list:all'],
    // Links in the header, like a docs site. Point them at your catalog's pages or other sites; an entry with items is a dropdown.
    // read more at https://eventcatalog.dev/docs/development/customization/header-navigation
    header: [
      { label: 'Architecture', href: '/visualiser/system-context-map', match: '/visualiser' },
      { label: 'Domains', href: '/discover/domains' },
      { label: 'Schemas', href: '/schemas/explorer', match: '/schemas' },
      {
        label: 'Resources',
        items: [
          {
            label: 'Explore',
            items: [
              {
                label: 'Services',
                href: '/discover/services',
                icon: 'Server',
                description: 'What each service sends and receives',
              },
              { label: 'Events', href: '/discover/events', icon: 'Zap', description: 'Every event in the architecture' },
              { label: 'Flows', href: '/discover/flows', icon: 'Workflow', description: 'Business processes, step by step' },
            ],
          },
          {
            label: 'Organisation',
            items: [
              { label: 'Teams', href: '/directory/teams', icon: 'Users', description: 'Who owns what' },
              {
                label: 'Entity map',
                href: '/visualiser/entity-map',
                icon: 'Database',
                description: 'The data behind each domain',
              },
            ],
          },
        ],
      },
    ],
  },
  mermaid: {
    enableSupportForElkLayout: true,
    iconPacks: ['logos'],
  },
  rss: {
    enabled: false,
    limit: 15,
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
  // Customize the logo, add your logo to public/ folder
  logo: {
    alt: '<organizationName> Logo',
    src: '/logo.png',
    text: '<organizationName>',
  },
  // This lets you copy markdown contents from EventCatalog to your clipboard
  // Including schemas for your events and services
  llmsTxt: {
    enabled: true,
  },
  // Architecture reference: every build writes architecture.html to your build output, your whole
  // catalog as one HTML file you can share, attach or host. Uncomment this to turn it off.
  // exports: {
  //   html: { enabled: false },
  // },
  // required random generated id used by eventcatalog
  cId: '<cId>',
  // required by eventcatalog
  tsd: '<tsd>',
};
